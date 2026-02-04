// Voice Journey Types
// 12-week voice development journey integrated into BookArchitect

export type Phase = 'stone' | 'transfer' | 'application' | 'autonomous';

export interface StoneSession {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  timestamp: number; // Unix timestamp
  duration: number; // seconds
  completed: boolean;
  reflection?: string; // Max 3 sentences
}

export interface WritingSession {
  id: string;
  date: string;
  timestamp: number;
  duration: number; // minutes
  wordCount: number;
  resonanceScore: number; // 1-10
  phase: Phase;
  chapterId?: string;
}

export interface ResonanceScore {
  id: string;
  date: string;
  score: number; // 1-10
  sessionId: string;
  timestamp: number;
}

export interface UnlockState {
  textEditor: boolean;
  multipleChapters: boolean;
  fullChapterManagement: boolean;
  reflectionWorkspace: boolean;
  communityFeatures: boolean;
  fullEditor: boolean;
  exportFeatures: boolean;
}

export interface EngagementPrompt {
  id: string;
  message: string;
  type: 'sensation' | 'resonance' | 'anchor' | 'awareness';
  phase: 2 | 3 | 4; // Which week ranges active
  intervalMinutes: number;
}

export interface MigrationChoice {
  choice: 'journey' | 'skip';
  timestamp: string;
  previousDataPreserved: boolean;
}

export interface ArchivedBook {
  bookId: string;
  archivedAt: string;
  accessibleAfterWeek: number; // Week 13
}

// Progress store state interface
export interface ProgressState {
  // Core tracking
  phase: Phase;
  startDate: string | null; // ISO date string
  hasCompletedOnboarding: boolean;

  // Stone phase tracking
  stoneSessionsLog: StoneSession[];
  dailyStoneGoal: number; // Default: 2

  // Writing phase tracking
  writingSessionsLog: WritingSession[];

  // Resonance data
  resonanceScores: ResonanceScore[];

  // Feature unlocks
  unlocked: UnlockState;

  // Migration (for existing users)
  migrationChoice: MigrationChoice | null;
  archivedBooks: ArchivedBook[];

  // Admin/dev mode
  devModeEnabled: boolean;
}

// Prompts store state interface
export interface PromptsState {
  // Active prompt
  currentPrompt: EngagementPrompt | null;
  promptStartTime: number | null;

  // Timing
  lastPromptTime: number | null;
  nextPromptTime: number | null;
  promptInterval: number; // Minutes

  // Session tracking
  writingSessionStartTime: number | null;
  isWritingSessionActive: boolean;

  // History
  promptsShownToday: string[]; // prompt IDs
  totalPromptsAnswered: number;
  promptsAnsweredThisSession: number;

  // Settings
  promptsEnabled: boolean;

  // Internal: tracks last daily reset (YYYY-MM-DD format)
  _lastResetDate: string;
}

// Computed helper types
export interface WeekInfo {
  week: number;
  day: number;
  daysSinceStart: number;
  phase: Phase;
}
