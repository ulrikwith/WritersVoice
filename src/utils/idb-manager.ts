/**
 * IndexedDB Connection Manager
 * Provides a singleton connection pool for efficient database access.
 * Instead of opening a new connection per operation, maintains a reusable connection.
 */

const DB_NAME = 'book_architect_db';
const DB_VERSION = 3;

export const STORE_NAMES = {
  BACKUPS: 'backups',
  RESEARCH: 'research',
  APP_STATE: 'app_state',
} as const;

type StoreName = typeof STORE_NAMES[keyof typeof STORE_NAMES];

// Singleton connection instance
let dbConnection: IDBDatabase | null = null;
let connectionPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the database schema during upgrade
 */
const initializeSchema = (db: IDBDatabase) => {
  if (!db.objectStoreNames.contains(STORE_NAMES.BACKUPS)) {
    db.createObjectStore(STORE_NAMES.BACKUPS, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.RESEARCH)) {
    db.createObjectStore(STORE_NAMES.RESEARCH, { keyPath: 'bookId' });
  }
  if (!db.objectStoreNames.contains(STORE_NAMES.APP_STATE)) {
    db.createObjectStore(STORE_NAMES.APP_STATE);
  }
};

/**
 * Handle connection close events (browser may close idle connections)
 */
const handleConnectionClose = () => {
  dbConnection = null;
  connectionPromise = null;
};

/**
 * Get or create a database connection (singleton pattern)
 * Returns the cached connection if available, otherwise opens a new one
 */
export const getConnection = (): Promise<IDBDatabase> => {
  // Return existing connection if valid
  if (dbConnection && dbConnection.name === DB_NAME) {
    return Promise.resolve(dbConnection);
  }

  // Return in-progress connection attempt if one exists
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      initializeSchema(db);
    };

    request.onsuccess = () => {
      dbConnection = request.result;

      // Handle unexpected connection close
      dbConnection.onclose = handleConnectionClose;
      dbConnection.onerror = (event) => {
        console.error('IndexedDB error:', event);
      };

      connectionPromise = null;
      resolve(dbConnection);
    };

    request.onerror = () => {
      connectionPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn('IndexedDB connection blocked - close other tabs using this database');
    };
  });

  return connectionPromise;
};

/**
 * Close the database connection (useful for cleanup or testing)
 */
export const closeConnection = (): void => {
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }
  connectionPromise = null;
};

/**
 * Execute a read operation on a store
 */
export const readFromStore = async <T>(
  storeName: StoreName,
  key?: IDBValidKey
): Promise<T | T[] | null> => {
  const db = await getConnection();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    const request = key !== undefined ? store.get(key) : store.getAll();

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Execute a write operation on a store
 */
export const writeToStore = async <T>(
  storeName: StoreName,
  data: T,
  key?: IDBValidKey
): Promise<void> => {
  const db = await getConnection();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Use put for key-value stores, add for object stores with keyPath
    const request = key !== undefined ? store.put(data, key) : store.put(data);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete an item from a store
 */
export const deleteFromStore = async (
  storeName: StoreName,
  key: IDBValidKey
): Promise<void> => {
  const db = await getConnection();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const request = store.delete(key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Count items in a store
 */
export const countInStore = async (storeName: StoreName): Promise<number> => {
  const db = await getConnection();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);

    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Execute a custom transaction with multiple operations
 * Useful for complex operations that need atomicity
 */
export const executeTransaction = async <T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  callback: (tx: IDBTransaction) => Promise<T>
): Promise<T> => {
  const db = await getConnection();
  const stores = Array.isArray(storeNames) ? storeNames : [storeNames];

  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: T;

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));

    callback(tx)
      .then((r) => {
        result = r;
      })
      .catch((err) => {
        tx.abort();
        reject(err);
      });
  });
};

// Export singleton manager
export const idbManager = {
  getConnection,
  closeConnection,
  readFromStore,
  writeToStore,
  deleteFromStore,
  countInStore,
  executeTransaction,
  STORE_NAMES,
};

export default idbManager;
