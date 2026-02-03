// Cloud Sync Utilities
// Provides export/import functionality for cloud storage services
// Uses IndexedDB (via idb-keyval) for Zustand store compatibility

import type { BookProject } from '../types';
import { getAllResearchData, saveResearchData } from './persistence';
import { validateExportData, validateResearchBackup, sanitizeBookProject } from './validation';
import { idbStorage } from './idb-storage';

export interface ExportData {
  version: string;
  exportDate: string;
  books: BookProject[];
  activeBookId: string;
  streakData?: unknown;
  dailyGoal?: unknown;
  researchData?: any[];
}

/**
 * Export all data as JSON for cloud sync
 * Reads from IndexedDB (primary) with localStorage fallback for migration
 */
export async function exportAllData(): Promise<ExportData> {
  // Read from IndexedDB first (where Zustand persist stores data), fallback to localStorage
  let booksData = await idbStorage.getItem('writer_sheet_books');
  if (!booksData) {
    // Fallback to localStorage for migration scenarios
    booksData = localStorage.getItem('writer_sheet_books');
  }
  const activeBookId = localStorage.getItem('writer_sheet_active_id');
  const streakData = localStorage.getItem('writer_sheet_streak_data');
  const dailyGoal = localStorage.getItem('writer_sheet_daily_goal');
  const researchData = await getAllResearchData();

  // Parse books data - Zustand persist stores as { state: { books: [...] }, version: 0 }
  let books: BookProject[] = [];
  if (booksData) {
    try {
      const parsed = JSON.parse(booksData);
      // Zustand persist format
      if (parsed.state && Array.isArray(parsed.state.books)) {
        books = parsed.state.books;
      }
      // Direct format (shouldn't happen with current setup, but handle it)
      else if (parsed.books && Array.isArray(parsed.books)) {
        books = parsed.books;
      }
    } catch (e) {
      console.error('Error parsing books data for export:', e);
      books = [];
    }
  }

  return {
    version: '2.0',
    exportDate: new Date().toISOString(),
    books,
    activeBookId: activeBookId || '1',
    streakData: streakData ? JSON.parse(streakData) : null,
    dailyGoal: dailyGoal ? JSON.parse(dailyGoal) : null,
    researchData
  };
}

/**
 * Import all data from cloud sync backup
 * Writes to IndexedDB (where Zustand reads from) with localStorage fallback for verification
 */
export async function importAllData(data: ExportData): Promise<boolean> {
  try {
    console.log('=== IMPORT STARTING ===');
    console.log('Import data structure:', {
      version: data.version,
      exportDate: data.exportDate,
      booksCount: Array.isArray(data.books) ? data.books.length : 0,
      firstBookTitle: Array.isArray(data.books) && data.books.length > 0 ? data.books[0].title : 'N/A'
    });

    // Validate the data
    const validation = validateExportData(data);
    if (!validation.valid) {
      console.error('❌ Import validation failed:', validation.errors);
      throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
    }

    // Sanitize books data to remove potentially malicious content
    const sanitizedBooks = data.books.map(book => sanitizeBookProject(book));
    console.log('✓ Sanitized', sanitizedBooks.length, 'books');

    if (sanitizedBooks && sanitizedBooks.length > 0) {
      // Write to IndexedDB in Zustand persist format: { state: { books: [...] }, version: 0 }
      // This matches where useBookStore reads from (idb-storage)
      const dataToStore = JSON.stringify({
        state: {
          books: sanitizedBooks,
          outlineDrafts: [], // Include outlineDrafts as it's part of the partialize
          substackDrafts: [] // Include substackDrafts as it's part of the partialize
        },
        version: 0
      });

      await idbStorage.setItem('writer_sheet_books', dataToStore);
      console.log('✓ Wrote books to IndexedDB');

      // CRITICAL FIX: Force flush by reading back immediately
      const verification = await idbStorage.getItem('writer_sheet_books');
      if (!verification || verification !== dataToStore) {
        throw new Error('Failed to verify IndexedDB write - data may not have persisted');
      }
      console.log('✓ Verified IndexedDB write - data matches');

      // Also write to localStorage for backward compatibility and verification in UI
      localStorage.setItem('writer_sheet_books', dataToStore);
    }

    // Import other data
    if (data.activeBookId) {
      const bookExists = sanitizedBooks.some(book => book.id === data.activeBookId);
      if (bookExists) {
        localStorage.setItem('writer_sheet_active_id', data.activeBookId);
      } else if (sanitizedBooks.length > 0) {
        localStorage.setItem('writer_sheet_active_id', sanitizedBooks[0].id);
      }
    }

    if (data.streakData) {
      localStorage.setItem('writer_sheet_streak_data', JSON.stringify(data.streakData));
    }

    if (data.dailyGoal) {
      localStorage.setItem('writer_sheet_daily_goal', JSON.stringify(data.dailyGoal));
    }

    // Import research data if present
    if (data.researchData && Array.isArray(data.researchData)) {
      for (const researchItem of data.researchData) {
        await saveResearchData(
          researchItem.bookId,
          researchItem.themes || [],
          researchItem.sources || [],
          researchItem.cards || []
        );
      }
      console.log('✓ Imported research data');
    }

    console.log('=== IMPORT COMPLETED SUCCESSFULLY ===');
    return true;
  } catch (error) {
    console.error('❌ Import failed:', error);
    return false;
  }
}

/**
 * Import research data from backup
 */
export async function importResearchData(data: any): Promise<boolean> {
  try {
    const validation = validateResearchBackup(data);
    if (!validation.valid) {
      console.error('Research validation failed:', validation.errors);
      throw new Error(`Invalid research backup: ${validation.errors.join(', ')}`);
    }

    if (data.books && Array.isArray(data.books)) {
      for (const bookData of data.books) {
        await saveResearchData(
          bookData.id,
          bookData.themes || [],
          bookData.sources || [],
          bookData.researchCards || []
        );
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to import research data:', error);
    return false;
  }
}

/**
 * Download export data as a JSON file
 */
export async function downloadExport(): Promise<void> {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookarchitect-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);

  // Use onload event to safely revoke URL after download starts
  const cleanup = () => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  if ('onload' in a) {
    a.addEventListener('load', cleanup, { once: true });
  }
  // Fallback for browsers that don't fire load event on anchor clicks
  setTimeout(cleanup, 1000);

  a.click();
}

/**
 * Import data from a JSON file
 */
export async function importFromFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    return await importAllData(data);
  } catch (error) {
    console.error('Failed to import from file:', error);
    return false;
  }
}

/**
 * Sync settings interface
 */
export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  lastSync?: string;
}

/**
 * Get sync settings from localStorage
 */
export function getSyncSettings(): SyncSettings {
  const stored = localStorage.getItem('writer_sheet_sync_settings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse sync settings:', e);
    }
  }
  return { autoSync: false, syncInterval: 30 };
}
