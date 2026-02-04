// Blue.cc Services - Main Export
// Aggregates all Blue.cc service modules
//
// Architecture: Uses description-based metadata storage (PMT pattern)
// - Data is stored as Base64-encoded JSON in todo text field
// - Avoids Blue.cc custom fields API which has schema validation issues
// - Proven pattern used by PMT for reliable cloud sync

export { blueCore } from './core';
export { booksService } from './books';
export { chaptersService } from './chapters';
export { voiceJourneyService } from './voiceJourney';

// Metadata utilities for encoding/decoding
export * from './metadata';

// Re-export types
export * from './types';

// Convenience object for grouped access
import { blueCore } from './core';
import { booksService } from './books';
import { chaptersService } from './chapters';
import { voiceJourneyService } from './voiceJourney';

export const blueClient = {
  core: blueCore,
  books: booksService,
  chapters: chaptersService,
  voiceJourney: voiceJourneyService,
};

export default blueClient;
