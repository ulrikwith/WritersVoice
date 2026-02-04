// Voice Journey Prompts Store
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { idbStorage } from '../utils/idb-storage';
import { getPromptInterval } from '../utils/phaseUnlock';
import { selectPrompt } from '../constants/prompts';
import type { PromptsState, EngagementPrompt } from '../types/voice-journey';

interface PromptsActions {
  // Session management
  startWritingSession: () => void;
  endWritingSession: () => void;

  // Prompt management
  showPrompt: (prompt: EngagementPrompt) => void;
  dismissPrompt: () => void;
  scheduleNextPrompt: (week: number) => void;
  checkAndShowPrompt: (week: number) => boolean;

  // Settings
  setPromptsEnabled: (enabled: boolean) => void;
  adjustInterval: (minutes: number) => void;

  // Reset
  resetDailyPrompts: () => void;
  resetSession: () => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

interface PromptsStore extends PromptsState, PromptsActions {
  hasHydrated: boolean;
}

// Get today's date for resetting daily prompts
const getToday = () => new Date().toISOString().split('T')[0];

// Custom storage wrapper
const storage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    const value = await idbStorage.getItem(name);
    if (value) {
      return value;
    }
    const localValue = localStorage.getItem(name);
    if (localValue) {
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

export const usePromptsStore = create<PromptsStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentPrompt: null,
      promptStartTime: null,
      lastPromptTime: null,
      nextPromptTime: null,
      promptInterval: 5, // Default 5 minutes
      writingSessionStartTime: null,
      isWritingSessionActive: false,
      promptsShownToday: [],
      totalPromptsAnswered: 0,
      promptsAnsweredThisSession: 0,
      promptsEnabled: true,
      hasHydrated: false,
      _lastResetDate: getToday(),

      // === Session Management ===

      startWritingSession: () => {
        const state = get();
        // Check if we need to reset daily prompts
        const today = getToday();
        if (state._lastResetDate !== today) {
          set((s) => {
            s.promptsShownToday = [];
            s._lastResetDate = today;
          });
        }

        set((s) => {
          s.writingSessionStartTime = Date.now();
          s.isWritingSessionActive = true;
          s.promptsAnsweredThisSession = 0;
          s.currentPrompt = null;
        });

        // Schedule first prompt
        const week = 2; // Will be overridden by caller
        get().scheduleNextPrompt(week);
      },

      endWritingSession: () => {
        set((state) => {
          state.writingSessionStartTime = null;
          state.isWritingSessionActive = false;
          state.currentPrompt = null;
          state.nextPromptTime = null;
        });
      },

      // === Prompt Management ===

      showPrompt: (prompt: EngagementPrompt) => {
        set((state) => {
          state.currentPrompt = prompt;
          state.promptStartTime = Date.now();
          state.lastPromptTime = Date.now();
          if (!state.promptsShownToday.includes(prompt.id)) {
            state.promptsShownToday.push(prompt.id);
          }
        });
      },

      dismissPrompt: () => {
        set((state) => {
          state.currentPrompt = null;
          state.promptStartTime = null;
          state.totalPromptsAnswered += 1;
          state.promptsAnsweredThisSession += 1;
        });
      },

      scheduleNextPrompt: (week: number) => {
        const interval = getPromptInterval(week);
        if (interval === null) {
          set((state) => {
            state.nextPromptTime = null;
          });
          return;
        }

        set((state) => {
          state.promptInterval = interval;
          state.nextPromptTime = Date.now() + interval * 60 * 1000;
        });
      },

      checkAndShowPrompt: (week: number) => {
        const state = get();

        // Don't show if:
        // - Session not active
        // - Prompts disabled
        // - Already showing a prompt
        // - Not time yet
        if (
          !state.isWritingSessionActive ||
          !state.promptsEnabled ||
          state.currentPrompt !== null
        ) {
          return false;
        }

        // Check if it's time
        if (state.nextPromptTime && Date.now() < state.nextPromptTime) {
          return false;
        }

        // Select and show a prompt
        const prompt = selectPrompt(week, state.promptsShownToday);
        if (prompt) {
          get().showPrompt(prompt);
          get().scheduleNextPrompt(week);
          return true;
        }

        return false;
      },

      // === Settings ===

      setPromptsEnabled: (enabled: boolean) => {
        set((state) => {
          state.promptsEnabled = enabled;
        });
      },

      adjustInterval: (minutes: number) => {
        set((state) => {
          state.promptInterval = minutes;
          if (state.isWritingSessionActive && state.lastPromptTime) {
            state.nextPromptTime = state.lastPromptTime + minutes * 60 * 1000;
          }
        });
      },

      // === Reset ===

      resetDailyPrompts: () => {
        set((state) => {
          state.promptsShownToday = [];
          state._lastResetDate = getToday();
        });
      },

      resetSession: () => {
        set((state) => {
          state.currentPrompt = null;
          state.promptStartTime = null;
          state.writingSessionStartTime = null;
          state.isWritingSessionActive = false;
          state.nextPromptTime = null;
          state.promptsAnsweredThisSession = 0;
        });
      },

      // === Hydration ===

      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },
    })),
    {
      name: 'voice_journey_prompts',
      storage: storage,
      partialize: (state) => ({
        totalPromptsAnswered: state.totalPromptsAnswered,
        promptsEnabled: state.promptsEnabled,
        promptInterval: state.promptInterval,
        _lastResetDate: state._lastResetDate,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Hook to manage prompt scheduling during writing sessions
 */
export function usePromptScheduler(week: number) {
  const {
    isWritingSessionActive,
    promptsEnabled,
    checkAndShowPrompt,
    currentPrompt,
    nextPromptTime,
  } = usePromptsStore();

  // Calculate time until next prompt
  const timeUntilNextPrompt = nextPromptTime
    ? Math.max(0, nextPromptTime - Date.now())
    : null;

  return {
    isActive: isWritingSessionActive && promptsEnabled,
    currentPrompt,
    timeUntilNextPrompt,
    checkForPrompt: () => checkAndShowPrompt(week),
  };
}
