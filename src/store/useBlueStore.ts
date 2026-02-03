// Blue.cc Store
// Zustand store for Blue.cc connection state and sync management

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { blueClient } from '../services/bluecc';
import type { BlueConfig, Phase, VoiceJourneyState, Book, FeatureName } from '../services/bluecc/types';

// ============================================================================
// Types
// ============================================================================

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface BlueState {
  // Connection State
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  userId: string | null;
  config: BlueConfig | null;

  // Sync State
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  syncError: string | null;

  // Voice Journey State (mirrored from Blue.cc)
  journeyState: VoiceJourneyState | null;
  unlockedFeatures: string[];
  currentPhase: Phase | null;

  // Books State (mirrored from Blue.cc)
  books: Book[];
  booksLoaded: boolean;

  // Actions
  connect: (config: BlueConfig) => Promise<boolean>;
  disconnect: () => void;
  checkConnection: () => Promise<boolean>;

  // Journey Actions
  loadJourney: () => Promise<void>;
  recordStoneSession: (duration: number, note?: string) => Promise<void>;
  recordWritingSession: (duration: number, promptCompleted?: boolean) => Promise<void>;
  recordResonance: (score: number, context: string, chapterId?: string) => Promise<void>;
  checkFeatureUnlocks: () => Promise<string[]>;

  // Feature Gate
  isFeatureUnlocked: (feature: FeatureName) => boolean;

  // Books Actions
  loadBooks: () => Promise<void>;
  syncBook: (book: { id?: string; title: string; description?: string }) => Promise<string | null>;
  deleteBook: (bookId: string) => Promise<boolean>;

  // Full Sync
  syncAll: () => Promise<void>;

  // Dev Tools
  resetJourney: () => Promise<void>;
  forcePhase: (phase: Phase) => Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

export const useBlueStore = create<BlueState>()(
  persist(
    immer((set, get) => ({
      // Initial State
      connectionStatus: 'disconnected',
      connectionError: null,
      userId: null,
      config: null,

      syncStatus: 'idle',
      lastSyncTime: null,
      syncError: null,

      journeyState: null,
      unlockedFeatures: [],
      currentPhase: null,

      books: [],
      booksLoaded: false,

      // ========================================================================
      // Connection Actions
      // ========================================================================

      connect: async (config: BlueConfig) => {
        set((state) => {
          state.connectionStatus = 'connecting';
          state.connectionError = null;
        });

        try {
          // Initialize the Blue.cc client
          blueClient.core.initialize(config);

          // Ensure workspace exists
          const workspaceResult = await blueClient.core.ensureWorkspace();
          if (!workspaceResult.success) {
            throw new Error(workspaceResult.error || 'Failed to connect to workspace');
          }

          // Ensure custom fields exist
          await blueClient.customFields.ensureBookArchitectFields();

          // Check connection and get user ID
          const connectionResult = await blueClient.core.checkConnection();
          if (!connectionResult.success || !connectionResult.data?.connected) {
            throw new Error('Connection check failed');
          }

          set((state) => {
            state.connectionStatus = 'connected';
            state.userId = connectionResult.data?.userId || null;
            state.config = config;
          });

          console.log('[Blue.cc Store] Connected successfully');
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          set((state) => {
            state.connectionStatus = 'error';
            state.connectionError = errorMessage;
          });
          console.error('[Blue.cc Store] Connection failed:', errorMessage);
          return false;
        }
      },

      disconnect: () => {
        blueClient.core.reset();
        set((state) => {
          state.connectionStatus = 'disconnected';
          state.connectionError = null;
          state.userId = null;
          state.config = null;
          state.journeyState = null;
          state.unlockedFeatures = [];
          state.currentPhase = null;
          state.books = [];
          state.booksLoaded = false;
        });
        console.log('[Blue.cc Store] Disconnected');
      },

      checkConnection: async () => {
        const result = await blueClient.core.checkConnection();
        const connected = result.success && result.data?.connected === true;

        set((state) => {
          state.connectionStatus = connected ? 'connected' : 'disconnected';
        });

        return connected;
      },

      // ========================================================================
      // Journey Actions
      // ========================================================================

      loadJourney: async () => {
        const userId = get().userId;
        if (!userId) {
          console.warn('[Blue.cc Store] Cannot load journey - no user ID');
          return;
        }

        const result = await blueClient.voiceJourney.getJourney(userId);

        if (result.success && result.data) {
          const journeyData = result.data;
          set((state) => {
            state.journeyState = journeyData;
            state.currentPhase = journeyData.currentPhase;
            state.unlockedFeatures = journeyData.unlockedFeatures || [];
          });
          console.log('[Blue.cc Store] Journey loaded:', journeyData.currentPhase);
        }
      },

      recordStoneSession: async (duration: number, note?: string) => {
        const userId = get().userId;
        if (!userId) return;

        const result = await blueClient.voiceJourney.recordStoneSession(userId, {
          duration,
          recognitionNote: note,
        });

        if (result.success && result.data) {
          const journeyData = result.data;
          set((state) => {
            state.journeyState = journeyData;
            state.currentPhase = journeyData.currentPhase;
            state.unlockedFeatures = journeyData.unlockedFeatures || [];
          });

          if (result.message) {
            console.log('[Blue.cc Store] Phase transition:', result.message);
          }
        }
      },

      recordWritingSession: async (duration: number, promptCompleted?: boolean) => {
        const userId = get().userId;
        if (!userId) return;

        const result = await blueClient.voiceJourney.recordWritingSession(userId, {
          duration,
          promptCompleted,
        });

        if (result.success && result.data) {
          const journeyData = result.data;
          set((state) => {
            state.journeyState = journeyData;
            state.currentPhase = journeyData.currentPhase;
            state.unlockedFeatures = journeyData.unlockedFeatures || [];
          });
        }
      },

      recordResonance: async (score: number, context: string, chapterId?: string) => {
        const userId = get().userId;
        if (!userId) return;

        const result = await blueClient.voiceJourney.recordResonance(userId, {
          score,
          context,
          chapterId,
        });

        if (result.success && result.data) {
          const journeyData = result.data;
          set((state) => {
            state.journeyState = journeyData;
          });
        }
      },

      checkFeatureUnlocks: async () => {
        const userId = get().userId;
        if (!userId) return [];

        const result = await blueClient.voiceJourney.checkFeatureUnlocks(userId);

        if (result.success && result.data) {
          const { journey, newUnlocks } = result.data;
          set((state) => {
            state.journeyState = journey;
            state.unlockedFeatures = journey.unlockedFeatures || [];
          });

          return newUnlocks;
        }

        return [];
      },

      // ========================================================================
      // Feature Gate
      // ========================================================================

      isFeatureUnlocked: (feature: FeatureName) => {
        const { currentPhase, unlockedFeatures } = get();

        // Autonomous phase has everything
        if (currentPhase === 'autonomous') return true;

        // Check explicit unlocks
        return unlockedFeatures.includes(feature);
      },

      // ========================================================================
      // Books Actions
      // ========================================================================

      loadBooks: async () => {
        const result = await blueClient.books.getBooks();

        if (result.success && result.data) {
          const booksData = result.data;
          set((state) => {
            state.books = booksData;
            state.booksLoaded = true;
          });
          console.log('[Blue.cc Store] Books loaded:', booksData.length);
        }
      },

      syncBook: async (book) => {
        const result = await blueClient.books.syncBook(book);

        if (result.success && result.data) {
          // Reload books to get updated list
          await get().loadBooks();
          return result.data.id;
        }

        return null;
      },

      deleteBook: async (bookId: string) => {
        const result = await blueClient.books.deleteBook(bookId);

        if (result.success) {
          set((state) => {
            state.books = state.books.filter((b) => b.id !== bookId);
          });
          return true;
        }

        return false;
      },

      // ========================================================================
      // Full Sync
      // ========================================================================

      syncAll: async () => {
        set((state) => {
          state.syncStatus = 'syncing';
          state.syncError = null;
        });

        try {
          // Load journey and books in parallel
          await Promise.all([get().loadJourney(), get().loadBooks()]);

          // Check for feature unlocks
          await get().checkFeatureUnlocks();

          set((state) => {
            state.syncStatus = 'synced';
            state.lastSyncTime = new Date().toISOString();
          });

          console.log('[Blue.cc Store] Full sync complete');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sync failed';
          set((state) => {
            state.syncStatus = 'error';
            state.syncError = errorMessage;
          });
          console.error('[Blue.cc Store] Sync error:', errorMessage);
        }
      },

      // ========================================================================
      // Dev Tools
      // ========================================================================

      resetJourney: async () => {
        const userId = get().userId;
        if (!userId) return;

        await blueClient.voiceJourney.resetJourney(userId);

        set((state) => {
          state.journeyState = null;
          state.currentPhase = null;
          state.unlockedFeatures = [];
        });

        // Reload journey (will create fresh one)
        await get().loadJourney();
      },

      forcePhase: async (phase: Phase) => {
        const userId = get().userId;
        if (!userId) return;

        const result = await blueClient.voiceJourney.forcePhase(userId, phase);

        if (result.success && result.data) {
          const journeyData = result.data;
          set((state) => {
            state.journeyState = journeyData;
            state.currentPhase = journeyData.currentPhase;
            state.unlockedFeatures = journeyData.unlockedFeatures || [];
          });
        }
      },
    })),
    {
      name: 'blue-cc-store',
      partialize: (state) => ({
        // Only persist config and connection state
        config: state.config,
        userId: state.userId,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsConnected = (state: BlueState) =>
  state.connectionStatus === 'connected';

export const selectCurrentPhase = (state: BlueState) => state.currentPhase;

export const selectUnlockedFeatures = (state: BlueState) => state.unlockedFeatures;

export const selectJourneyState = (state: BlueState) => state.journeyState;

export const selectBooks = (state: BlueState) => state.books;

export const selectSyncStatus = (state: BlueState) => state.syncStatus;

export default useBlueStore;
