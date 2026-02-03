// Voice Journey Progress Store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { idbStorage } from '../utils/idb-storage';
import {
  calculatePhase,
  calculateUnlocks,
  getDaysSinceStart,
  getCurrentWeek,
  getDayOfWeek,
  getNewUnlocks,
  type FeatureUnlock,
} from '../utils/phaseUnlock';
import type {
  Phase,
  ProgressState,
  StoneSession,
  WritingSession,
  UnlockState,
  MigrationChoice,
} from '../types/voice-journey';

// Generate unique IDs
const generateId = () =>
  Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);

// Get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];

interface ProgressActions {
  // Journey lifecycle
  startJourney: () => void;
  skipJourney: () => void;
  resetJourney: () => void;
  completeOnboarding: () => void;

  // Stone phase
  completeStoneSession: (duration: number, reflection?: string) => void;
  getStoneSessionsToday: () => number;
  canDoStoneSessionNow: () => boolean;

  // Writing sessions
  startWritingSession: () => string;
  endWritingSession: (sessionId: string, wordCount: number) => void;
  getWritingSessionsThisWeek: () => number;

  // Resonance
  recordResonanceScore: (sessionId: string, score: number) => void;
  getAverageResonanceThisWeek: () => number;
  getAverageResonanceAllTime: () => number;

  // Phase management
  checkPhaseTransition: () => FeatureUnlock[];
  getCurrentWeek: () => number;
  getCurrentDay: () => number;
  getDaysSinceStart: () => number;
  getPhase: () => Phase;

  // Dev/admin tools
  setDevMode: (enabled: boolean) => void;
  forcePhase: (phase: Phase) => void;
  forceDay: (day: number) => void;
  forceUnlock: (feature: keyof UnlockState) => void;

  // Migration
  setMigrationChoice: (choice: MigrationChoice) => void;
  archiveBook: (bookId: string) => void;
  unarchiveBook: (bookId: string) => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

interface ProgressStore extends ProgressState, ProgressActions {
  hasHydrated: boolean;
}

// Default unlock state (nothing unlocked)
const DEFAULT_UNLOCKS: UnlockState = {
  textEditor: false,
  multipleChapters: false,
  fullChapterManagement: false,
  reflectionWorkspace: false,
  communityFeatures: false,
  fullEditor: false,
  exportFeatures: false,
};

// Custom storage wrapper matching the pattern from useBookStore
const storage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    const value = await idbStorage.getItem(name);
    if (value) {
      return value;
    }
    // Check localStorage for migration
    const localValue = localStorage.getItem(name);
    if (localValue) {
      console.log('Migrating progress data from localStorage to IndexedDB...');
      await idbStorage.setItem(name, localValue);
      return localValue;
    }
    return null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbStorage.removeItem(name);
  },
}));

export const useProgressStore = create<ProgressStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      phase: 'stone' as Phase,
      startDate: null,
      hasCompletedOnboarding: false,
      stoneSessionsLog: [],
      dailyStoneGoal: 2,
      writingSessionsLog: [],
      resonanceScores: [],
      unlocked: DEFAULT_UNLOCKS,
      migrationChoice: null,
      archivedBooks: [],
      devModeEnabled: false,
      hasHydrated: false,

      // === Journey Lifecycle ===

      startJourney: () => {
        set((state) => {
          state.startDate = new Date().toISOString();
          state.phase = 'stone';
          state.unlocked = DEFAULT_UNLOCKS;
          state.hasCompletedOnboarding = true;
        });
      },

      skipJourney: () => {
        set((state) => {
          state.phase = 'autonomous';
          state.hasCompletedOnboarding = true;
          state.migrationChoice = {
            choice: 'skip',
            timestamp: new Date().toISOString(),
            previousDataPreserved: true,
          };
          // Unlock everything
          state.unlocked = {
            textEditor: true,
            multipleChapters: true,
            fullChapterManagement: true,
            reflectionWorkspace: true,
            communityFeatures: true,
            fullEditor: true,
            exportFeatures: true,
          };
        });
      },

      resetJourney: () => {
        set((state) => {
          state.phase = 'stone';
          state.startDate = null;
          state.hasCompletedOnboarding = false;
          state.stoneSessionsLog = [];
          state.writingSessionsLog = [];
          state.resonanceScores = [];
          state.unlocked = DEFAULT_UNLOCKS;
          state.migrationChoice = null;
          state.archivedBooks = [];
        });
      },

      completeOnboarding: () => {
        set((state) => {
          state.hasCompletedOnboarding = true;
          if (!state.startDate) {
            state.startDate = new Date().toISOString();
          }
        });
      },

      // === Stone Phase ===

      completeStoneSession: (duration: number, reflection?: string) => {
        set((state) => {
          const session: StoneSession = {
            id: generateId(),
            date: getToday(),
            timestamp: Date.now(),
            duration,
            completed: true,
            reflection,
          };
          state.stoneSessionsLog.push(session);
        });
      },

      getStoneSessionsToday: () => {
        const { stoneSessionsLog } = get();
        const today = getToday();
        return stoneSessionsLog.filter(
          (s) => s.date === today && s.completed
        ).length;
      },

      canDoStoneSessionNow: () => {
        const { dailyStoneGoal } = get();
        const sessionsToday = get().getStoneSessionsToday();
        return sessionsToday < dailyStoneGoal;
      },

      // === Writing Sessions ===

      startWritingSession: () => {
        const sessionId = generateId();
        set((state) => {
          const session: WritingSession = {
            id: sessionId,
            date: getToday(),
            timestamp: Date.now(),
            duration: 0,
            wordCount: 0,
            resonanceScore: 0,
            phase: state.phase,
          };
          state.writingSessionsLog.push(session);
        });
        return sessionId;
      },

      endWritingSession: (sessionId: string, wordCount: number) => {
        set((state) => {
          const session = state.writingSessionsLog.find(
            (s) => s.id === sessionId
          );
          if (session) {
            session.duration = Math.round(
              (Date.now() - session.timestamp) / 1000 / 60
            ); // in minutes
            session.wordCount = wordCount;
          }
        });
      },

      getWritingSessionsThisWeek: () => {
        const { writingSessionsLog, startDate } = get();
        if (!startDate) return 0;

        // Calculate journey week boundaries (based on start date, not calendar)
        const daysSinceStart = getDaysSinceStart(startDate);
        const currentWeek = getCurrentWeek(daysSinceStart);
        const weekStartDay = (currentWeek - 1) * 7; // Day 0-6 = week 1, 7-13 = week 2, etc.
        const start = new Date(startDate);
        start.setDate(start.getDate() + weekStartDay);
        start.setHours(0, 0, 0, 0);

        return writingSessionsLog.filter(
          (s) => new Date(s.date) >= start
        ).length;
      },

      // === Resonance ===

      recordResonanceScore: (sessionId: string, score: number) => {
        set((state) => {
          // Update the writing session
          const session = state.writingSessionsLog.find(
            (s) => s.id === sessionId
          );
          if (session) {
            session.resonanceScore = score;
          }

          // Also add to resonance scores log
          state.resonanceScores.push({
            id: generateId(),
            date: getToday(),
            score,
            sessionId,
            timestamp: Date.now(),
          });
        });
      },

      getAverageResonanceThisWeek: () => {
        const { resonanceScores, startDate } = get();
        if (!startDate || resonanceScores.length === 0) return 0;

        // Calculate journey week boundaries (based on start date, not calendar)
        const daysSinceStart = getDaysSinceStart(startDate);
        const currentWeek = getCurrentWeek(daysSinceStart);
        const weekStartDay = (currentWeek - 1) * 7;
        const start = new Date(startDate);
        start.setDate(start.getDate() + weekStartDay);
        start.setHours(0, 0, 0, 0);

        const thisWeekScores = resonanceScores.filter(
          (s) => new Date(s.date) >= start
        );

        if (thisWeekScores.length === 0) return 0;

        const sum = thisWeekScores.reduce((acc, s) => acc + s.score, 0);
        return Math.round((sum / thisWeekScores.length) * 10) / 10;
      },

      getAverageResonanceAllTime: () => {
        const { resonanceScores } = get();
        if (resonanceScores.length === 0) return 0;

        const sum = resonanceScores.reduce((acc, s) => acc + s.score, 0);
        return Math.round((sum / resonanceScores.length) * 10) / 10;
      },

      // === Phase Management ===

      checkPhaseTransition: () => {
        const { startDate, phase, devModeEnabled } = get();
        if (!startDate || devModeEnabled) return [];

        const daysSinceStart = getDaysSinceStart(startDate);
        const newPhase = calculatePhase(daysSinceStart);
        const newUnlocks = calculateUnlocks(daysSinceStart);
        const previousWeek = getCurrentWeek(
          getDaysSinceStart(startDate) - 1
        );
        const currentWeek = getCurrentWeek(daysSinceStart);

        // Check for feature unlocks
        const featureUnlocks = getNewUnlocks(previousWeek, currentWeek);

        // Update state if phase changed
        if (newPhase !== phase) {
          set((state) => {
            state.phase = newPhase;
            state.unlocked = newUnlocks;
          });
        } else {
          // Just update unlocks
          set((state) => {
            state.unlocked = newUnlocks;
          });
        }

        return featureUnlocks;
      },

      getCurrentWeek: () => {
        const { startDate } = get();
        if (!startDate) return 1;
        return getCurrentWeek(getDaysSinceStart(startDate));
      },

      getCurrentDay: () => {
        const { startDate } = get();
        if (!startDate) return 1;
        return getDayOfWeek(getDaysSinceStart(startDate));
      },

      getDaysSinceStart: () => {
        const { startDate } = get();
        return getDaysSinceStart(startDate);
      },

      getPhase: () => {
        return get().phase;
      },

      // === Dev/Admin Tools ===

      setDevMode: (enabled: boolean) => {
        set((state) => {
          state.devModeEnabled = enabled;
        });
      },

      forcePhase: (phase: Phase) => {
        set((state) => {
          state.phase = phase;
          state.devModeEnabled = true;

          // Set appropriate unlocks for forced phase
          switch (phase) {
            case 'stone':
              state.unlocked = DEFAULT_UNLOCKS;
              break;
            case 'transfer':
              state.unlocked = { ...DEFAULT_UNLOCKS, textEditor: true };
              break;
            case 'application':
              state.unlocked = {
                ...DEFAULT_UNLOCKS,
                textEditor: true,
                multipleChapters: true,
                fullChapterManagement: true,
                reflectionWorkspace: true,
              };
              break;
            case 'autonomous':
              state.unlocked = {
                textEditor: true,
                multipleChapters: true,
                fullChapterManagement: true,
                reflectionWorkspace: true,
                communityFeatures: true,
                fullEditor: true,
                exportFeatures: true,
              };
              break;
          }
        });
      },

      forceDay: (day: number) => {
        set((state) => {
          // Calculate start date to make today the specified day
          const now = new Date();
          now.setDate(now.getDate() - (day - 1));
          state.startDate = now.toISOString();
          state.devModeEnabled = true;

          // Recalculate phase and unlocks
          const daysSinceStart = day - 1;
          state.phase = calculatePhase(daysSinceStart);
          state.unlocked = calculateUnlocks(daysSinceStart);
        });
      },

      forceUnlock: (feature: keyof UnlockState) => {
        set((state) => {
          state.unlocked[feature] = true;
          state.devModeEnabled = true;
        });
      },

      // === Migration ===

      setMigrationChoice: (choice: MigrationChoice) => {
        set((state) => {
          state.migrationChoice = choice;
        });
      },

      archiveBook: (bookId: string) => {
        set((state) => {
          if (!state.archivedBooks.find((b) => b.bookId === bookId)) {
            state.archivedBooks.push({
              bookId,
              archivedAt: new Date().toISOString(),
              accessibleAfterWeek: 13,
            });
          }
        });
      },

      unarchiveBook: (bookId: string) => {
        set((state) => {
          state.archivedBooks = state.archivedBooks.filter(
            (b) => b.bookId !== bookId
          );
        });
      },

      // === Hydration ===

      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },
    })),
    {
      name: 'voice_journey_progress',
      storage: storage,
      partialize: (state) => ({
        phase: state.phase,
        startDate: state.startDate,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        stoneSessionsLog: state.stoneSessionsLog,
        dailyStoneGoal: state.dailyStoneGoal,
        writingSessionsLog: state.writingSessionsLog,
        resonanceScores: state.resonanceScores,
        unlocked: state.unlocked,
        migrationChoice: state.migrationChoice,
        archivedBooks: state.archivedBooks,
        devModeEnabled: state.devModeEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
