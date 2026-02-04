// Blue.cc Metadata Encoding Utility
// Stores rich metadata in todo text field using Base64 encoding
// Based on proven PMT pattern that works reliably with Blue.cc API

const META_MARKER = '---WV-META---';

/**
 * Compact key mappings for smaller payload sizes
 * Full key -> Compact key
 */
const KEY_MAPPINGS = {
  // Voice Journey keys
  currentPhase: 'cp',
  phaseStartDate: 'psd',
  weekInPhase: 'wip',
  stoneData: 'sd',
  transferData: 'td',
  applicationData: 'ad',
  autonomousData: 'aud',
  unlockedFeatures: 'uf',
  resonanceScores: 'rs',
  cohortId: 'cid',
  isVisible: 'iv',
  userId: 'uid',

  // Stone data keys
  sessionsCompleted: 'sc',
  targetSessions: 'ts',
  lastSessionDate: 'lsd',
  sessionDurations: 'sdr',
  recognitionNotes: 'rn',

  // Transfer data keys
  writingSessions: 'ws',
  microPromptsCompleted: 'mpc',
  reflectionsWritten: 'rw',
  averageWritingDuration: 'awd',
  lastWritingDate: 'lwd',

  // Application data keys
  currentWeek: 'cw',
  featureUnlockDates: 'fud',
  engagementMetrics: 'em',
  consecutiveDays: 'cd',
  totalWritingSessions: 'tws',
  averageSessionLength: 'asl',

  // Autonomous data keys
  entryDate: 'ed',
  fullCapabilityAccess: 'fca',
  voiceDevelopmentScore: 'vds',
  communityContributions: 'cc',

  // Book/Chapter keys
  title: 't',
  description: 'd',
  metadata: 'm',
  chapters: 'ch',
  position: 'p',
  genre: 'g',
  targetWordCount: 'twc',
  status: 's',
  googleDriveFolderId: 'gdfi',
  googleDriveFileId: 'gdf',
  createdAt: 'ca',
  updatedAt: 'ua',
  wordCount: 'wc',
  synopsis: 'syn',
  content: 'cnt',
  contentPreview: 'cp',
  lastEditedAt: 'lea',
  bookId: 'bid',
} as const;

// Reverse mappings for decoding
const REVERSE_KEY_MAPPINGS: Record<string, string> = Object.entries(KEY_MAPPINGS).reduce(
  (acc, [full, compact]) => {
    acc[compact] = full;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Compact an object's keys for smaller JSON size
 */
function compactKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? compactKeys(item as Record<string, unknown>)
        : item
    ) as unknown as Record<string, unknown>;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const compactKey = (KEY_MAPPINGS as Record<string, string>)[key] || key;

    if (value === null || value === undefined) {
      // Skip null/undefined values to save space
      continue;
    }

    if (typeof value === 'object') {
      result[compactKey] = compactKeys(value as Record<string, unknown>);
    } else {
      result[compactKey] = value;
    }
  }
  return result;
}

/**
 * Expand compact keys back to full keys
 */
function expandKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null
        ? expandKeys(item as Record<string, unknown>)
        : item
    ) as unknown as Record<string, unknown>;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = REVERSE_KEY_MAPPINGS[key] || key;

    if (typeof value === 'object') {
      result[fullKey] = expandKeys(value as Record<string, unknown>);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Encode metadata into a todo text field
 * Format: [human-readable description]\n\n---WV-META---\n[base64 encoded JSON]
 */
export function encodeMetadata(
  description: string,
  metadata: Record<string, unknown>
): string {
  // Compact keys for smaller payload
  const compactMeta = compactKeys(metadata);

  // Convert to JSON and Base64 encode
  const jsonString = JSON.stringify(compactMeta);
  const base64Meta = btoa(unescape(encodeURIComponent(jsonString)));

  // Combine description with encoded metadata
  const cleanDescription = (description || '').trim();

  if (!cleanDescription) {
    return `${META_MARKER}\n${base64Meta}`;
  }

  return `${cleanDescription}\n\n${META_MARKER}\n${base64Meta}`;
}

/**
 * Decode metadata from a todo text field
 */
export function decodeMetadata(text: string | null | undefined): {
  description: string;
  metadata: Record<string, unknown>;
} {
  if (!text) {
    return { description: '', metadata: {} };
  }

  if (!text.includes(META_MARKER)) {
    // No metadata marker found - return raw text as description
    return { description: text, metadata: {} };
  }

  const parts = text.split(META_MARKER);
  const description = parts[0].trim();

  // Extract Base64 portion (remove any HTML tags and whitespace)
  const rawMeta = parts[1] || '';
  const base64Meta = rawMeta.replace(/<[^>]*>/g, '').replace(/\s/g, '');

  if (!base64Meta) {
    return { description, metadata: {} };
  }

  try {
    // Decode Base64 -> JSON
    const jsonMeta = decodeURIComponent(escape(atob(base64Meta)));
    const parsed = JSON.parse(jsonMeta) as Record<string, unknown>;

    // Expand compact keys back to full keys
    const expanded = expandKeys(parsed);

    return { description, metadata: expanded };
  } catch (error) {
    console.error('[Blue.cc] Failed to decode metadata:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      preview: text.substring(0, 100),
    });

    // Return description without metadata on parse failure
    return { description: text.split(META_MARKER)[0].trim(), metadata: {} };
  }
}

/**
 * Update metadata in existing text while preserving description
 */
export function updateMetadata(
  existingText: string | null | undefined,
  metadataUpdates: Record<string, unknown>
): string {
  const { description, metadata } = decodeMetadata(existingText);

  // Merge existing metadata with updates
  const updatedMetadata = { ...metadata, ...metadataUpdates };

  return encodeMetadata(description, updatedMetadata);
}

/**
 * Update just the description while preserving metadata
 */
export function updateDescription(
  existingText: string | null | undefined,
  newDescription: string
): string {
  const { metadata } = decodeMetadata(existingText);
  return encodeMetadata(newDescription, metadata);
}

/**
 * Check if text contains encoded metadata
 */
export function hasMetadata(text: string | null | undefined): boolean {
  return Boolean(text && text.includes(META_MARKER));
}

/**
 * Get just the description portion (without metadata)
 */
export function getDescription(text: string | null | undefined): string {
  const { description } = decodeMetadata(text);
  return description;
}

/**
 * Get just the metadata portion
 */
export function getMetadata(text: string | null | undefined): Record<string, unknown> {
  const { metadata } = decodeMetadata(text);
  return metadata;
}

export default {
  encodeMetadata,
  decodeMetadata,
  updateMetadata,
  updateDescription,
  hasMetadata,
  getDescription,
  getMetadata,
};
