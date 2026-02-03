/**
 * Data validation utilities to ensure imported data integrity
 */

import type { BookProject, ChapterRow, ResearchTheme, ResearchSource, ResearchCard } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates chapter row structure
 */
function isValidChapterRow(obj: unknown): obj is ChapterRow {
  const data = obj as Record<string, any>;
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.content === 'string' &&
    typeof data.status === 'string' &&
    typeof data.completed === 'boolean'
  );
}

/**
 * Validates research theme structure
 */
function isValidResearchTheme(obj: unknown): obj is ResearchTheme {
  const data = obj as Record<string, any>;
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.title === 'string'
  );
}

/**
 * Validates research source structure
 */
function isValidResearchSource(obj: unknown): obj is ResearchSource {
  const data = obj as Record<string, any>;
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.themeId === 'string' &&
    typeof data.type === 'string' &&
    typeof data.title === 'string'
  );
}

/**
 * Validates research card structure
 */
function isValidResearchCard(obj: unknown): obj is ResearchCard {
  const data = obj as Record<string, any>;
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.sourceId === 'string' &&
    typeof data.content === 'string'
  );
}

/**
 * Validates a single book project
 */
export function validateBookProject(obj: unknown): ValidationResult {
  const errors: string[] = [];
  const data = obj as Record<string, any>;

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Book data must be an object'] };
  }

  if (typeof data.id !== 'string' || !data.id) {
    errors.push('Book ID must be a non-empty string');
  }

  if (typeof data.title !== 'string') {
    errors.push('Book title must be a string');
  }

  if (!Array.isArray(data.chapters)) {
    errors.push('Book chapters must be an array');
  } else {
    data.chapters.forEach((chapter: unknown, index: number) => {
      if (!isValidChapterRow(chapter)) {
        errors.push(`Chapter at index ${index} has invalid structure`);
      }
    });
  }

  // Validate research data if present
  if (data.themes !== undefined) {
    if (!Array.isArray(data.themes)) {
      errors.push('Book themes must be an array');
    } else {
      data.themes.forEach((theme: unknown, index: number) => {
        if (!isValidResearchTheme(theme)) {
          errors.push(`Theme at index ${index} has invalid structure`);
        }
      });
    }
  }

  if (data.sources !== undefined) {
    if (!Array.isArray(data.sources)) {
      errors.push('Book sources must be an array');
    } else {
      data.sources.forEach((source: unknown, index: number) => {
        if (!isValidResearchSource(source)) {
          errors.push(`Source at index ${index} has invalid structure`);
        }
      });
    }
  }

  if (data.researchCards !== undefined) {
    if (!Array.isArray(data.researchCards)) {
      errors.push('Book research cards must be an array');
    } else {
      data.researchCards.forEach((card: unknown, index: number) => {
        if (!isValidResearchCard(card)) {
          errors.push(`Research card at index ${index} has invalid structure`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates export data structure
 */
export function validateExportData(data: unknown): ValidationResult {
  const errors: string[] = [];
  const exportData = data as Record<string, any>;

  if (!exportData || typeof exportData !== 'object') {
    return { valid: false, errors: ['Import data must be an object'] };
  }

  if (typeof exportData.version !== 'string') {
    errors.push('Export version must be a string');
  }

  if (!Array.isArray(exportData.books)) {
    errors.push('Books must be an array');
  } else {
    // Validate each book
    exportData.books.forEach((book: unknown, index: number) => {
      const bookValidation = validateBookProject(book);
      if (!bookValidation.valid) {
        errors.push(`Book at index ${index}: ${bookValidation.errors.join(', ')}`);
      }
    });
  }

  if (exportData.activeBookId !== undefined && typeof exportData.activeBookId !== 'string') {
    errors.push('Active book ID must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates research backup data structure
 */
export function validateResearchBackup(data: unknown): ValidationResult {
  const errors: string[] = [];
  const backupData = data as Record<string, any>;

  if (!backupData || typeof backupData !== 'object') {
    return { valid: false, errors: ['Research backup data must be an object'] };
  }

  if (!Array.isArray(backupData.books)) {
    errors.push('Research backup books must be an array');
  } else {
    backupData.books.forEach((book: any, index: number) => {
      if (!book || typeof book !== 'object') {
        errors.push(`Book at index ${index} must be an object`);
        return;
      }

      if (typeof book.id !== 'string') {
        errors.push(`Book at index ${index} must have a valid id`);
      }

      if (book.themes !== undefined && !Array.isArray(book.themes)) {
        errors.push(`Book at index ${index} themes must be an array`);
      }

      if (book.sources !== undefined && !Array.isArray(book.sources)) {
        errors.push(`Book at index ${index} sources must be an array`);
      }

      if (book.researchCards !== undefined && !Array.isArray(book.researchCards)) {
        errors.push(`Book at index ${index} research cards must be an array`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Safely parses an integer with fallback value
 * Returns the parsed integer or the fallback if parsing fails
 */
export function safeParseInt(value: string | number | undefined | null, fallback: number = 0): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : parseInt(value, 10);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

/**
 * Validates and clamps a number to a range
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitizes book data by removing potentially dangerous properties
 */
export function sanitizeBookProject(book: any): BookProject {
  // Validate status is one of the allowed values
  const validStatuses = ['WRITING', 'EDITING', 'PUBLISHED'];
  const sanitizedStatus = book.status && validStatuses.includes(String(book.status))
    ? (String(book.status) as 'WRITING' | 'EDITING' | 'PUBLISHED')
    : undefined;

  return {
    id: String(book.id || Date.now()),
    title: String(book.title || 'Untitled Book'),
    description: book.description ? String(book.description) : undefined,
    author: book.author ? String(book.author) : undefined,
    coverUrl: book.coverUrl ? String(book.coverUrl) : undefined,
    status: sanitizedStatus,
    wordGoal: book.wordGoal !== undefined ? Number(book.wordGoal) : undefined,
    chapters: Array.isArray(book.chapters) ? book.chapters.map((ch: any) => ({
      id: String(ch.id || Date.now()),
      title: String(ch.title || 'Untitled Chapter'),
      content: String(ch.content || ''),
      status: String(ch.status || 'Writing'),
      completed: Boolean(ch.completed),
      writing: Boolean(ch.writing),
      editing: Boolean(ch.editing),
      comments: ch.comments ? String(ch.comments) : '',
      date: ch.date ? String(ch.date) : '',
      estHours: ch.estHours ? String(ch.estHours) : '',
      wordGoal: ch.wordGoal ? String(ch.wordGoal) : '2000',
      editLevel: typeof ch.editLevel === 'number' ? Math.max(1, Math.min(5, ch.editLevel)) : 5,
      lastUpdated: ch.lastUpdated ? String(ch.lastUpdated) : undefined
    })) : [],
    themes: Array.isArray(book.themes) ? book.themes : [],
    sources: Array.isArray(book.sources) ? book.sources : [],
    researchCards: Array.isArray(book.researchCards) ? book.researchCards : [],
    lastUpdated: book.lastUpdated ? String(book.lastUpdated) : new Date().toISOString(),
    lastChapterId: book.lastChapterId ? String(book.lastChapterId) : undefined
  };
}
