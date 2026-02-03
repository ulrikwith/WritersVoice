export interface Snapshot {
  id: string;
  timestamp: string;
  content: string;
  note?: string;
}

export interface EditChecklist {
  drafting: boolean;
  structural: boolean;
  evidence: boolean;
  lineEdit: boolean;
  finalPolish: boolean;
}

export interface ChapterRow {
  id: string;
  completed: boolean;
  writing: boolean;
  editing: boolean;
  title: string;
  content: string; 
  status: string;
  comments: string;
  date: string;
  estHours: string;
  wordGoal: string;
  editLevel?: number;
  lastUpdated?: string; // ISO Timestamp
  keyTakeaway?: string; // The "Reader Promise" or core argument
  storyDate?: string; // Chronological date (e.g. "1999-12-31" or "Day 1")
  editChecklist?: EditChecklist; // Granular editing progress
  snapshots?: Snapshot[]; // Version history
}

export interface ResearchTheme {
  id: string;
  title: string;
  color: string; // For the "Binder" color
}

export type MediaType = 'book' | 'article' | 'interview' | 'video' | 'podcast' | 'paper' | 'other';

export interface ResearchSource {
  id: string;
  themeId: string;
  type: MediaType;
  title: string;
  author: string;
  url?: string;
  dateAccess?: string;
  notes?: string;
  capturedContent?: string;
  transcript?: { time: string; text: string }[];
  thumbnailUrl?: string;
  // Archetype Specifics
  publisher?: string;    // Books / Papers
  publication?: string;  // Journals / Websites
  host?: string;         // Podcasts / Interviews
  guest?: string;        // Podcasts / Interviews
  isbn?: string;         // Print Books
  physicalLoc?: string;  // Print Books (e.g. "Office Shelf A")
  doi?: string;          // Academic Papers
  volume?: string;       // Papers
  issue?: string;        // Papers
  customFields?: { label: string; value: string }[];
}

export interface ResearchCard {
  id: string;
  sourceId: string;
  content: string;
  tags: string[];
  pageNumber?: string;
  timestamp?: string;
  locationLabel?: string; // e.g. "Chapter 2, Para 3" for print
  status: 'raw' | 'verified' | 'used';
  linkedChapterIds: string[];
  createdAt: string;
  images?: string[];
}

export interface BookProject {
  id: string;
  title: string;
  chapters: ChapterRow[];
  themes: ResearchTheme[]; // New field for Binders
  sources: ResearchSource[];
  researchCards: ResearchCard[];
  lastUpdated?: string; // ISO Timestamp
  coverUrl?: string;
  description?: string;
  author?: string;
  status?: 'WRITING' | 'EDITING' | 'PUBLISHED';
  wordGoal?: number;
  startDate?: string;
  deadline?: string;
  lastChapterId?: string;
  seriesId?: string;
  seriesName?: string;
  seriesIndex?: number;
  tags?: string[];
  theme?: string;
}

export interface OutlineDraft {
  id: string;
  title: string;
  idea: string;
  targetReader: string;
  thesis: string;
  style: string;
  pov: string;
  step: number; // 1 to 8
  chapters: {
    id: string;
    title: string;
    oneLiner: string;
    summary: string;
  }[];
  lastUpdated: string;
}

export interface SubstackDraft {
  id: string;
  title: string;
  hook: string; // The core idea/concept
  openingLine: string; // The crafted opening hook/first line
  targetReader: string;
  coreArgument: string; // The main thesis/takeaway
  tone: string;
  format: 'essay' | 'listicle' | 'howto' | 'story' | 'analysis';
  step: number; // 1 to 8
  sections: {
    id: string;
    heading: string;
    keyPoint: string;
    notes: string;
  }[];
  callToAction: string;
  seoKeywords: string[];
  estimatedReadTime: number; // in minutes
  lastUpdated: string;
}
