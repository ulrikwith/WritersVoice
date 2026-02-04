// Blue.cc Voice Journey Service
// Tracks voice development journey progress with phase transitions
// Uses description-based metadata storage (PMT pattern) for reliable sync

import blueCore from './core';
import { encodeMetadata, decodeMetadata } from './metadata';
import type {
  ApiResponse,
  Phase,
  VoiceJourneyState,
  StoneSessionInput,
  WritingSessionInput,
  ResonanceInput,
  ResonanceScore,
  Todo,
} from './types';

// In-memory cache for journey state
const journeyCache = new Map<string, VoiceJourneyState>();

class VoiceJourneyService {
  /**
   * Get or create a voice journey for a user
   */
  async getJourney(userId: string): Promise<ApiResponse<VoiceJourneyState>> {
    // Check cache first
    if (journeyCache.has(userId)) {
      return { success: true, data: journeyCache.get(userId)! };
    }

    // Query Blue.cc for existing journey
    const listId = await blueCore.getJourneyListId();
    const searchResult = await blueCore.searchTodos(listId, userId, 1);

    if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
      const journeyTodo = searchResult.data[0];
      const journey = this.parseJourneyFromTodo(journeyTodo);
      journeyCache.set(userId, journey);
      return { success: true, data: journey };
    }

    // No journey exists - create default
    return this.createJourney(userId);
  }

  /**
   * Create a new voice journey for a user
   */
  async createJourney(userId: string): Promise<ApiResponse<VoiceJourneyState>> {
    const listId = await blueCore.getJourneyListId();

    // Initialize journey state
    const initialState: VoiceJourneyState = {
      userId,
      currentPhase: 'stone',
      phaseStartDate: new Date().toISOString(),
      weekInPhase: 1,
      stoneData: {
        sessionsCompleted: 0,
        targetSessions: 21,
        lastSessionDate: null,
        sessionDurations: [],
        recognitionNotes: [],
      },
      unlockedFeatures: [],
      resonanceScores: [],
    };

    // Encode journey state as metadata in description
    const todoText = encodeMetadata(
      `Voice Journey for user ${userId}`,
      initialState as unknown as Record<string, unknown>
    );

    const result = await blueCore.createTodo(
      listId,
      `Voice Journey - ${userId}`,
      todoText
    );

    if (!result.success || !result.data) {
      return { success: false, error: 'Failed to create journey todo' };
    }

    initialState.id = result.data.id;
    journeyCache.set(userId, initialState);

    console.log(`[Blue.cc] Created voice journey for user: ${userId}`);

    return { success: true, data: initialState };
  }

  /**
   * Record a stone practice session
   */
  async recordStoneSession(
    userId: string,
    sessionData: StoneSessionInput
  ): Promise<ApiResponse<VoiceJourneyState>> {
    const journeyResult = await this.getJourney(userId);
    if (!journeyResult.success || !journeyResult.data) {
      return journeyResult;
    }

    const journey = journeyResult.data;

    // Update stone data
    journey.stoneData.sessionsCompleted += 1;
    journey.stoneData.lastSessionDate = new Date().toISOString();
    journey.stoneData.sessionDurations.push(sessionData.duration);

    if (sessionData.recognitionNote) {
      journey.stoneData.recognitionNotes.push({
        date: new Date().toISOString(),
        note: sessionData.recognitionNote,
      });
    }

    // Check for phase transition (21 sessions = 1 week complete)
    if (journey.stoneData.sessionsCompleted >= 21 && journey.currentPhase === 'stone') {
      return this.transitionToTransfer(userId, journey);
    }

    // Save updated journey
    await this.saveJourney(journey);

    return { success: true, data: journey };
  }

  /**
   * Transition from Stone to Transfer phase
   */
  async transitionToTransfer(
    userId: string,
    journey: VoiceJourneyState
  ): Promise<ApiResponse<VoiceJourneyState>> {
    journey.currentPhase = 'transfer';
    journey.phaseStartDate = new Date().toISOString();
    journey.weekInPhase = 2;

    journey.transferData = {
      writingSessions: 0,
      microPromptsCompleted: 0,
      reflectionsWritten: 0,
      averageWritingDuration: 0,
      lastWritingDate: null,
    };

    // Unlock basic writing features
    journey.unlockedFeatures = [
      'basic-writing',
      'micro-prompts',
      'simple-reflection',
    ];

    await this.saveJourney(journey);

    console.log(`[Blue.cc] User ${userId} transitioned to Transfer phase`);

    return {
      success: true,
      data: journey,
      message: 'Phase transition: Stone -> Transfer. Writing now unlocked!',
    };
  }

  /**
   * Record a writing session
   */
  async recordWritingSession(
    userId: string,
    sessionData: WritingSessionInput
  ): Promise<ApiResponse<VoiceJourneyState>> {
    const journeyResult = await this.getJourney(userId);
    if (!journeyResult.success || !journeyResult.data) {
      return journeyResult;
    }

    const journey = journeyResult.data;

    // Check if writing is unlocked
    if (journey.currentPhase === 'stone') {
      return {
        success: false,
        error: 'Writing not yet unlocked. Complete stone phase first.',
      };
    }

    // Update phase-specific data
    if (journey.currentPhase === 'transfer' && journey.transferData) {
      journey.transferData.writingSessions += 1;
      journey.transferData.lastWritingDate = new Date().toISOString();

      // Calculate rolling average
      const totalDuration =
        journey.transferData.averageWritingDuration *
          (journey.transferData.writingSessions - 1) +
        sessionData.duration;
      journey.transferData.averageWritingDuration =
        totalDuration / journey.transferData.writingSessions;

      if (sessionData.promptCompleted) {
        journey.transferData.microPromptsCompleted += 1;
      }
      if (sessionData.reflectionWritten) {
        journey.transferData.reflectionsWritten += 1;
      }

      // Check for transition to Application (14 days + 10 sessions)
      const daysSincePhaseStart = this.daysSince(journey.phaseStartDate);
      if (daysSincePhaseStart >= 14 && journey.transferData.writingSessions >= 10) {
        return this.transitionToApplication(userId, journey);
      }
    }

    if (journey.currentPhase === 'application' && journey.applicationData) {
      journey.applicationData.engagementMetrics.totalWritingSessions += 1;

      // Update average session length
      const total =
        journey.applicationData.engagementMetrics.averageSessionLength *
          (journey.applicationData.engagementMetrics.totalWritingSessions - 1) +
        sessionData.duration;
      journey.applicationData.engagementMetrics.averageSessionLength =
        total / journey.applicationData.engagementMetrics.totalWritingSessions;
    }

    await this.saveJourney(journey);

    return { success: true, data: journey };
  }

  /**
   * Transition from Transfer to Application phase
   */
  async transitionToApplication(
    userId: string,
    journey: VoiceJourneyState
  ): Promise<ApiResponse<VoiceJourneyState>> {
    journey.currentPhase = 'application';
    journey.phaseStartDate = new Date().toISOString();
    journey.weekInPhase = 4;

    journey.applicationData = {
      currentWeek: 4,
      unlockedFeatures: ['text-editing', 'multiple-chapters'],
      featureUnlockDates: {
        'text-editing': new Date().toISOString(),
        'multiple-chapters': new Date().toISOString(),
      },
      engagementMetrics: {
        consecutiveDays: 0,
        totalWritingSessions: 0,
        averageSessionLength: 0,
      },
    };

    // Add new features to master unlock list
    journey.unlockedFeatures = [
      ...(journey.unlockedFeatures || []),
      'text-editing',
      'multiple-chapters',
    ];

    await this.saveJourney(journey);

    console.log(`[Blue.cc] User ${userId} transitioned to Application phase`);

    return {
      success: true,
      data: journey,
      message: 'Phase transition: Transfer -> Application. Progressive features unlocking!',
    };
  }

  /**
   * Check and unlock features based on time progression
   */
  async checkFeatureUnlocks(
    userId: string
  ): Promise<ApiResponse<{ newUnlocks: string[]; journey: VoiceJourneyState }>> {
    const journeyResult = await this.getJourney(userId);
    if (!journeyResult.success || !journeyResult.data) {
      return { success: false, error: journeyResult.error };
    }

    const journey = journeyResult.data;

    if (journey.currentPhase !== 'application') {
      return { success: true, data: { newUnlocks: [], journey } };
    }

    const weeksSincePhaseStart = Math.floor(this.daysSince(journey.phaseStartDate) / 7);
    const currentWeek = 4 + weeksSincePhaseStart;
    const newUnlocks: string[] = [];

    const unlockSchedule: Record<number, string[]> = {
      4: ['text-editing', 'multiple-chapters'],
      5: ['reflection-workspace', 'chapter-reordering'],
      6: ['community-features', 'peer-visibility'],
      7: ['advanced-prompts', 'resonance-tracking'],
      8: ['export-capabilities', 'publishing-prep'],
      10: ['export-features'],
      12: ['full-autonomous-access'],
    };

    for (const [week, features] of Object.entries(unlockSchedule)) {
      if (currentWeek >= parseInt(week)) {
        for (const feature of features) {
          // Ensure applicationData exists before accessing
          if (!journey.applicationData) {
            console.warn('[Blue.cc] applicationData missing in application phase, initializing');
            journey.applicationData = {
              currentWeek: currentWeek,
              unlockedFeatures: [],
              featureUnlockDates: {},
              engagementMetrics: {
                consecutiveDays: 0,
                totalWritingSessions: 0,
                averageSessionLength: 0,
              },
            };
          }

          if (!journey.applicationData.unlockedFeatures.includes(feature)) {
            journey.applicationData.unlockedFeatures.push(feature);
            journey.applicationData.featureUnlockDates[feature] = new Date().toISOString();

            if (!journey.unlockedFeatures?.includes(feature)) {
              journey.unlockedFeatures = [...(journey.unlockedFeatures || []), feature];
            }

            newUnlocks.push(feature);
          }
        }
      }
    }

    // Check for autonomous transition
    if (
      currentWeek >= 13 &&
      (journey.applicationData?.engagementMetrics?.consecutiveDays ?? 0) >= 7
    ) {
      const transitionResult = await this.transitionToAutonomous(userId, journey);
      if (transitionResult.success && transitionResult.data) {
        return {
          success: true,
          data: { newUnlocks: [...newUnlocks, 'autonomous-access'], journey: transitionResult.data },
        };
      }
    }

    if (newUnlocks.length > 0) {
      if (journey.applicationData) {
        journey.applicationData.currentWeek = currentWeek;
      }
      await this.saveJourney(journey);
    }

    return { success: true, data: { newUnlocks, journey } };
  }

  /**
   * Transition to Autonomous phase
   */
  async transitionToAutonomous(
    userId: string,
    journey: VoiceJourneyState
  ): Promise<ApiResponse<VoiceJourneyState>> {
    journey.currentPhase = 'autonomous';
    journey.phaseStartDate = new Date().toISOString();
    journey.weekInPhase = 13;

    journey.autonomousData = {
      entryDate: new Date().toISOString(),
      fullCapabilityAccess: true,
      voiceDevelopmentScore: 100,
      communityContributions: 0,
    };

    // Unlock all features
    journey.unlockedFeatures = [
      'basic-writing',
      'micro-prompts',
      'simple-reflection',
      'text-editing',
      'multiple-chapters',
      'reflection-workspace',
      'chapter-reordering',
      'community-features',
      'peer-visibility',
      'advanced-prompts',
      'resonance-tracking',
      'export-capabilities',
      'export-features',
      'publishing-prep',
      'full-autonomous-access',
    ];

    await this.saveJourney(journey);

    console.log(`[Blue.cc] User ${userId} achieved Autonomous phase!`);

    return {
      success: true,
      data: journey,
      message: 'Congratulations! You have achieved autonomous voice capacity.',
    };
  }

  /**
   * Record a resonance score
   */
  async recordResonance(
    userId: string,
    resonanceData: ResonanceInput
  ): Promise<ApiResponse<VoiceJourneyState>> {
    const journeyResult = await this.getJourney(userId);
    if (!journeyResult.success || !journeyResult.data) {
      return journeyResult;
    }

    const journey = journeyResult.data;

    const resonanceScore: ResonanceScore = {
      date: new Date().toISOString(),
      score: resonanceData.score,
      context: resonanceData.context,
      chapterId: resonanceData.chapterId,
    };

    if (!journey.resonanceScores) {
      journey.resonanceScores = [];
    }

    journey.resonanceScores.push(resonanceScore);

    // Keep last 100 scores
    if (journey.resonanceScores.length > 100) {
      journey.resonanceScores = journey.resonanceScores.slice(-100);
    }

    await this.saveJourney(journey);

    return { success: true, data: journey };
  }

  /**
   * Get average resonance score
   */
  async getAverageResonance(userId: string): Promise<ApiResponse<number>> {
    const journeyResult = await this.getJourney(userId);
    if (!journeyResult.success || !journeyResult.data) {
      return { success: false, error: journeyResult.error, data: 0 };
    }

    const scores = journeyResult.data.resonanceScores || [];
    if (scores.length === 0) {
      return { success: true, data: 0 };
    }

    const average = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    return { success: true, data: Math.round(average * 10) / 10 };
  }

  /**
   * Update consecutive days tracking
   */
  async updateConsecutiveDays(userId: string): Promise<ApiResponse<number>> {
    const journeyResult = await this.getJourney(userId);
    if (!journeyResult.success || !journeyResult.data) {
      return { success: false, error: journeyResult.error, data: 0 };
    }

    const journey = journeyResult.data;

    if (journey.currentPhase !== 'application' || !journey.applicationData) {
      return { success: true, data: 0 };
    }

    // This would typically check against a daily activity log
    // For now, just increment
    journey.applicationData.engagementMetrics.consecutiveDays += 1;
    await this.saveJourney(journey);

    return {
      success: true,
      data: journey.applicationData.engagementMetrics.consecutiveDays,
    };
  }

  /**
   * Reset journey (for testing/dev)
   */
  async resetJourney(userId: string): Promise<ApiResponse<void>> {
    const journeyResult = await this.getJourney(userId);
    if (journeyResult.success && journeyResult.data?.id) {
      await blueCore.deleteTodo(journeyResult.data.id);
    }

    journeyCache.delete(userId);
    console.log(`[Blue.cc] Reset journey for user: ${userId}`);

    return { success: true };
  }

  /**
   * Force a phase (for testing/dev)
   */
  async forcePhase(userId: string, phase: Phase): Promise<ApiResponse<VoiceJourneyState>> {
    const journeyResult = await this.getJourney(userId);
    if (!journeyResult.success || !journeyResult.data) {
      return journeyResult;
    }

    const journey = journeyResult.data;
    journey.currentPhase = phase;
    journey.phaseStartDate = new Date().toISOString();

    switch (phase) {
      case 'stone':
        journey.weekInPhase = 1;
        journey.unlockedFeatures = [];
        break;
      case 'transfer':
        journey.weekInPhase = 2;
        journey.unlockedFeatures = ['basic-writing', 'micro-prompts', 'simple-reflection'];
        journey.transferData = {
          writingSessions: 0,
          microPromptsCompleted: 0,
          reflectionsWritten: 0,
          averageWritingDuration: 0,
          lastWritingDate: null,
        };
        break;
      case 'application':
        journey.weekInPhase = 4;
        journey.unlockedFeatures = [
          'basic-writing', 'micro-prompts', 'simple-reflection',
          'text-editing', 'multiple-chapters',
        ];
        journey.applicationData = {
          currentWeek: 4,
          unlockedFeatures: ['text-editing', 'multiple-chapters'],
          featureUnlockDates: {},
          engagementMetrics: {
            consecutiveDays: 0,
            totalWritingSessions: 0,
            averageSessionLength: 0,
          },
        };
        break;
      case 'autonomous':
        journey.weekInPhase = 13;
        journey.unlockedFeatures = [
          'basic-writing', 'micro-prompts', 'simple-reflection',
          'text-editing', 'multiple-chapters', 'reflection-workspace',
          'chapter-reordering', 'community-features', 'peer-visibility',
          'advanced-prompts', 'resonance-tracking', 'export-capabilities',
          'export-features', 'publishing-prep', 'full-autonomous-access',
        ];
        journey.autonomousData = {
          entryDate: new Date().toISOString(),
          fullCapabilityAccess: true,
          voiceDevelopmentScore: 100,
          communityContributions: 0,
        };
        break;
    }

    await this.saveJourney(journey);

    return { success: true, data: journey };
  }

  /**
   * Validate that a string is a valid Phase
   */
  private isValidPhase(value: string): value is Phase {
    return ['stone', 'transfer', 'application', 'autonomous'].includes(value);
  }

  /**
   * Parse journey data from a Blue.cc todo using metadata encoding
   */
  private parseJourneyFromTodo(todo: Todo): VoiceJourneyState {
    // Decode metadata from todo text
    const { metadata } = decodeMetadata(todo.text);

    // Default journey structure
    const defaultJourney: VoiceJourneyState = {
      id: todo.id,
      userId: '',
      currentPhase: 'stone',
      phaseStartDate: todo.createdAt,
      weekInPhase: 1,
      stoneData: {
        sessionsCompleted: 0,
        targetSessions: 21,
        lastSessionDate: null,
        sessionDurations: [],
        recognitionNotes: [],
      },
      unlockedFeatures: [],
      resonanceScores: [],
    };

    // Merge decoded metadata with defaults
    const journey: VoiceJourneyState = {
      ...defaultJourney,
      ...metadata,
      id: todo.id, // Always use the todo ID
    } as VoiceJourneyState;

    // Validate phase
    if (!this.isValidPhase(journey.currentPhase)) {
      console.warn(`[Blue.cc] Invalid phase value: ${journey.currentPhase}, defaulting to 'stone'`);
      journey.currentPhase = 'stone';
    }

    // Extract userId from title if not in metadata
    if (!journey.userId) {
      const match = todo.title.match(/Voice Journey - (.+)/);
      if (match) {
        journey.userId = match[1];
      }
    }

    return journey;
  }

  /**
   * Save journey state to Blue.cc using metadata encoding
   */
  private async saveJourney(journey: VoiceJourneyState): Promise<ApiResponse<void>> {
    if (!journey.id) {
      return { success: false, error: 'Journey ID is required to save' };
    }

    try {
      // Encode journey state as metadata
      const todoText = encodeMetadata(
        `Voice Journey for user ${journey.userId}`,
        journey as unknown as Record<string, unknown>
      );

      // Update the todo with new text
      const result = await blueCore.updateTodo(journey.id, { text: todoText });

      if (!result.success) {
        console.error('[Blue.cc] Failed to save journey:', result.error);
        return { success: false, error: result.error };
      }

      // Update cache
      journeyCache.set(journey.userId, journey);

      return { success: true };
    } catch (error) {
      console.error('[Blue.cc] Error saving journey:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error saving journey',
      };
    }
  }

  /**
   * Calculate days since a date
   */
  private daysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Clear the journey cache
   */
  clearCache(): void {
    journeyCache.clear();
  }
}

// Singleton instance
export const voiceJourneyService = new VoiceJourneyService();

export default voiceJourneyService;
