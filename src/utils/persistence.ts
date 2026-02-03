import { idbManager, STORE_NAMES } from './idb-manager';

const MAX_BACKUPS = 20;

export const saveAppState = async (key: string, data: any) => {
  try {
    await idbManager.writeToStore(STORE_NAMES.APP_STATE, data, key);
  } catch (e) {
    console.error("Failed to save app state", e);
  }
};

export const getAppState = async (key: string): Promise<any> => {
  try {
    return await idbManager.readFromStore(STORE_NAMES.APP_STATE, key);
  } catch (e) {
    console.error("Failed to load app state", e);
    return null;
  }
};

export interface ResearchBackup {
  bookId: string;
  themes: any[];
  sources: any[];
  cards: any[];
  lastUpdated: string;
}

export const saveResearchData = async (bookId: string, themes: any[], sources: any[], cards: any[]) => {
  try {
    await idbManager.writeToStore(STORE_NAMES.RESEARCH, {
      bookId,
      themes,
      sources,
      cards,
      lastUpdated: new Date().toISOString()
    });
    return { success: true };
  } catch (e) {
    console.error("Research backup failed", e);
    return { success: false };
  }
};

export const getResearchData = async (bookId: string): Promise<ResearchBackup | null> => {
  try {
    return await idbManager.readFromStore<ResearchBackup>(STORE_NAMES.RESEARCH, bookId) as ResearchBackup | null;
  } catch (e) {
    console.error("Failed to load research data", e);
    return null;
  }
};

export const getAllResearchData = async (): Promise<ResearchBackup[]> => {
  try {
    const result = await idbManager.readFromStore<ResearchBackup>(STORE_NAMES.RESEARCH);
    return (result as ResearchBackup[]) || [];
  } catch (e) {
    console.error("Failed to load all research data", e);
    return [];
  }
};

export const deleteResearchData = async (bookId: string): Promise<{ success: boolean }> => {
  try {
    await idbManager.deleteFromStore(STORE_NAMES.RESEARCH, bookId);
    return { success: true };
  } catch (e) {
    console.error("Failed to delete research data", e);
    return { success: false };
  }
};

export interface BackupData {
  id: string; // timestamp ISO
  name: string; // readable name
  data: any; // The full book data
  created: number;
}

export const saveBackup = async (data: any): Promise<{ success: boolean; filename?: string }> => {
  // In development, try local API first for file system access
  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof data === 'string' ? data : JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Local API failed, falling back to IndexedDB", e);
    }
  }

  // IndexedDB Logic with connection pooling
  try {
    const now = new Date();
    const id = now.toISOString();
    const name = `Backup ${now.toLocaleString()}`;
    const backup: BackupData = {
      id,
      name,
      data: typeof data === 'string' ? JSON.parse(data) : data,
      created: now.getTime()
    };

    // Use transaction manager for atomic operations
    await idbManager.executeTransaction(
      STORE_NAMES.BACKUPS,
      'readwrite',
      async (tx) => {
        const store = tx.objectStore(STORE_NAMES.BACKUPS);

        // Add the backup
        await new Promise<void>((resolve, reject) => {
          const addRequest = store.add(backup);
          addRequest.onsuccess = () => resolve();
          addRequest.onerror = () => reject(addRequest.error);
        });

        // Rotation (Keep last N)
        const count = await new Promise<number>((resolve, reject) => {
          const countRequest = store.count();
          countRequest.onsuccess = () => resolve(countRequest.result);
          countRequest.onerror = () => reject(countRequest.error);
        });

        if (count > MAX_BACKUPS) {
          const toDelete = count - MAX_BACKUPS;
          await new Promise<void>((resolve, reject) => {
            const cursorRequest = store.openCursor();
            let deleted = 0;
            cursorRequest.onsuccess = (e) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor && deleted < toDelete) {
                cursor.delete();
                deleted++;
                cursor.continue();
              } else {
                resolve();
              }
            };
            cursorRequest.onerror = () => reject(cursorRequest.error);
          });
        }
      }
    );

    return { success: true, filename: id };
  } catch (e: unknown) {
    console.error("Backup failed", e);

    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded. Consider deleting old backups.');
      return { success: false, filename: undefined };
    }

    return { success: false };
  }
};

export const getBackups = async (): Promise<any[]> => {
  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/api/backup');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Local API failed", e);
    }
  }

  try {
    const result = await idbManager.readFromStore<BackupData>(STORE_NAMES.BACKUPS);
    const backups = (result as BackupData[]) || [];
    // Sort descending by ID (ISO timestamp)
    return backups.sort((a, b) => b.id.localeCompare(a.id));
  } catch (e) {
    console.error("Failed to list backups", e);
    return [];
  }
};
