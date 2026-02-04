// Blue.cc API Types
// Based on Blue.cc GraphQL API specification

// ============================================================================
// Authentication & Configuration
// ============================================================================

export interface BlueConfig {
  tokenId: string;
  secretId: string;
  projectId?: string;
  /**
   * Voice Journey list ID - stores user journey progression data
   * For production: Set via VITE_BLUE_JOURNEY_LIST_ID
   * If not set, will be auto-created as 'BookArchitect_VoiceJourneys'
   */
  journeyListId?: string;
  /**
   * Books list ID - stores book/chapter structure
   * For production: Set via VITE_BLUE_BOOKS_LIST_ID
   * If not set, will be auto-created as 'BookArchitect_Books'
   */
  booksListId?: string;
  /**
   * Community/Cohort list ID - stores community check-ins
   * For production: Set via VITE_BLUE_COMMUNITY_LIST_ID
   * If not set, will be auto-created as 'BookArchitect_Community'
   */
  cohortListId?: string;
  /**
   * Custom API endpoint (defaults to https://api.blue.cc/graphql)
   */
  endpoint?: string;
}

export interface AuthHeaders {
  'X-Bloo-Token-ID': string;
  'X-Bloo-Token-Secret': string;
  'Content-Type': string;
}

// ============================================================================
// Core API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
  cursor?: string;
}

// ============================================================================
// Todo List Types
// ============================================================================

export interface TodoList {
  id: string;
  title: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Todo {
  id: string;
  todoListId: string;
  title: string;
  text?: string; // Description field - used for metadata storage
  content?: string; // Legacy field
  completed: boolean;
  completedAt?: string;
  position: number;
  parentId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  customFieldValues?: CustomFieldValue[];
  tags?: Tag[];
  children?: Todo[];
}

export interface CreateTodoInput {
  todoListId: string;
  title: string;
  content?: string;
  parentId?: string;
  position?: number;
  tags?: string[];
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  content?: string;
  completed?: boolean;
  position?: number;
  parentId?: string;
}

// ============================================================================
// Custom Fields Types
// ============================================================================

export type CustomFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'JSON';

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  projectId: string;
  options?: string[]; // For SELECT/MULTI_SELECT types
  createdAt: string;
}

export interface CustomFieldValue {
  field: CustomField;
  value: string;
}

export interface SetCustomFieldInput {
  todoId: string;
  fieldId: string;
  value: string;
}

// ============================================================================
// Tag Types
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

// ============================================================================
// Voice Journey Types (Custom to BookArchitect)
// ============================================================================

export type Phase = 'stone' | 'transfer' | 'application' | 'autonomous';

export interface StoneData {
  sessionsCompleted: number;
  targetSessions: number; // 21 (3 per day × 7 days)
  lastSessionDate: string | null;
  sessionDurations: number[];
  recognitionNotes: Array<{
    date: string;
    note: string;
  }>;
}

export interface TransferData {
  writingSessions: number;
  microPromptsCompleted: number;
  reflectionsWritten: number;
  averageWritingDuration: number;
  lastWritingDate: string | null;
}

export interface ApplicationData {
  currentWeek: number; // 4-12
  unlockedFeatures: string[];
  featureUnlockDates: Record<string, string>;
  engagementMetrics: {
    consecutiveDays: number;
    totalWritingSessions: number;
    averageSessionLength: number;
  };
}

export interface AutonomousData {
  entryDate: string;
  fullCapabilityAccess: boolean;
  voiceDevelopmentScore: number; // 0-100
  communityContributions: number;
}

export interface ResonanceScore {
  date: string;
  score: number; // 1-10
  context: string;
  chapterId?: string;
}

export interface VoiceJourneyState {
  id?: string;
  userId: string;
  currentPhase: Phase;
  phaseStartDate: string;
  weekInPhase: number;
  stoneData: StoneData;
  transferData?: TransferData;
  applicationData?: ApplicationData;
  autonomousData?: AutonomousData;
  unlockedFeatures?: string[];
  resonanceScores?: ResonanceScore[];
  cohortId?: string;
  isVisible?: boolean;
}

export interface StoneSessionInput {
  duration: number;
  recognitionNote?: string;
}

export interface WritingSessionInput {
  duration: number;
  promptCompleted?: boolean;
  reflectionWritten?: boolean;
  chapterId?: string;
}

export interface ResonanceInput {
  score: number;
  context: string;
  chapterId?: string;
}

// ============================================================================
// Book/Chapter Types (Mapped to Blue.cc Todos)
// ============================================================================

export interface BookMetadata {
  genre?: string;
  targetWordCount?: number;
  status?: 'draft' | 'editing' | 'published';
  googleDriveFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  metadata: BookMetadata;
  chapters?: Chapter[];
  position: number;
}

export interface ChapterMetadata {
  wordCount?: number;
  googleDriveFileId?: string;
  status?: 'draft' | 'review' | 'complete';
  lastEditedAt?: string;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  synopsis?: string;
  content?: string;
  contentPreview?: string;
  metadata: ChapterMetadata;
  position: number;
}

export interface CreateBookInput {
  title: string;
  description?: string;
  metadata?: Partial<BookMetadata>;
}

export interface UpdateBookInput {
  id: string;
  title?: string;
  description?: string;
  metadata?: Partial<BookMetadata>;
}

export interface CreateChapterInput {
  bookId: string;
  title: string;
  synopsis?: string;
  content?: string;
  metadata?: Partial<ChapterMetadata>;
  position?: number;
}

export interface UpdateChapterInput {
  id: string;
  title?: string;
  synopsis?: string;
  content?: string;
  metadata?: Partial<ChapterMetadata>;
  position?: number;
}

// ============================================================================
// Community Types
// ============================================================================

export interface CheckIn {
  id: string;
  userId: string;
  userName: string;
  title: string;
  reflection: string;
  phase: Phase;
  cohortId: string;
  createdAt: string;
}

export interface CreateCheckInInput {
  userName: string;
  title: string;
  reflection: string;
  phase: Phase;
  cohortId: string;
}

// ============================================================================
// Custom Fields Names (Constants)
// ============================================================================

export const CUSTOM_FIELD_NAMES = {
  // Voice Journey Fields
  VOICE_JOURNEY_PHASE: 'VoiceJourney_Phase',
  VOICE_JOURNEY_PROGRESS: 'VoiceJourney_Progress',
  VOICE_JOURNEY_STONE_DATA: 'VoiceJourney_StoneData',
  VOICE_JOURNEY_RESONANCE: 'VoiceJourney_Resonance',
  VOICE_JOURNEY_UNLOCKED_FEATURES: 'VoiceJourney_UnlockedFeatures',

  // Book/Chapter Fields
  BOOK_METADATA: 'BookArchitect_BookMetadata',
  CHAPTER_METADATA: 'BookArchitect_ChapterMetadata',
  GOOGLE_DRIVE_FILE_ID: 'BookArchitect_GoogleDriveFileId',

  // Community Fields
  COHORT_ID: 'BookArchitect_CohortId',
  USER_PROFILE: 'BookArchitect_UserProfile',
} as const;

// ============================================================================
// Feature Unlock Schedule
// ============================================================================

export const FEATURE_UNLOCK_SCHEDULE: Record<number, string[]> = {
  2: ['basic-writing', 'micro-prompts', 'simple-reflection'],
  4: ['text-editing', 'multiple-chapters'],
  5: ['reflection-workspace', 'chapter-reordering'],
  6: ['community-features', 'peer-visibility'],
  7: ['advanced-prompts', 'resonance-tracking'],
  8: ['export-capabilities', 'publishing-prep'],
  10: ['export-features'],
  12: ['full-autonomous-access'],
};

export type FeatureName =
  | 'basic-writing'
  | 'micro-prompts'
  | 'simple-reflection'
  | 'text-editing'
  | 'multiple-chapters'
  | 'reflection-workspace'
  | 'chapter-reordering'
  | 'community-features'
  | 'peer-visibility'
  | 'advanced-prompts'
  | 'resonance-tracking'
  | 'export-capabilities'
  | 'export-features'
  | 'publishing-prep'
  | 'full-autonomous-access';
