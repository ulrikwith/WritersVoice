// Blue.cc Services - Main Export
// Aggregates all Blue.cc service modules

export { blueCore } from './core';
export { customFieldsService } from './customFields';
export { booksService } from './books';
export { chaptersService } from './chapters';
export { voiceJourneyService } from './voiceJourney';

// Re-export types
export * from './types';

// Convenience object for grouped access
import { blueCore } from './core';
import { customFieldsService } from './customFields';
import { booksService } from './books';
import { chaptersService } from './chapters';
import { voiceJourneyService } from './voiceJourney';

export const blueClient = {
  core: blueCore,
  customFields: customFieldsService,
  books: booksService,
  chapters: chaptersService,
  voiceJourney: voiceJourneyService,
};

export default blueClient;
