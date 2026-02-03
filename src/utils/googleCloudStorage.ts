// Google Drive Personal Integration
// Provides automated backup and restore using personal Google Drive account

import type { ExportData } from './cloudSync';
import { exportAllData, importAllData, importResearchData } from './cloudSync';
import { getAllResearchData } from './persistence';
import { singleFlight } from './debounce';
import type { BookProject } from '../types';

const GCS_CONFIG_KEY = 'writer_sheet_gcs_config';

// Use environment variable with fallback to hardcoded value for backwards compatibility
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '825337651132-m92st7vkfdiim7i84ubo0icl0q07ltf9.apps.googleusercontent.com'; 

interface ResearchExportData {
  version: string;
  timestamp: string;
  books: {
    id: string;
    title: string;
    themes: any[];
    sources: any[];
    researchCards: any[];
  }[];
}

// Type definitions for Google Identity Services
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: any) => void;
            hint?: string;
          }) => TokenClient;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
}

export interface GCSConfig {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  folderId?: string;
  autoBackup: boolean;
  backupInterval: number;
  lastBackup?: string;
  enabled: boolean;
  userEmail?: string;
}

let tokenClient: TokenClient | null = null;
let refreshResolver: ((token: string | null) => void) | null = null;
let tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;
let pendingRefreshPromise: Promise<string | null> | null = null; // Prevent concurrent refresh requests

export function getGCSConfig(): GCSConfig {
  const stored = localStorage.getItem(GCS_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse GCS config:', e);
    }
  }

  return {
    autoBackup: false,
    backupInterval: 30,
    enabled: false
  };
}

export function setGCSConfig(config: Partial<GCSConfig>): void {
  const current = getGCSConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(GCS_CONFIG_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('gcs-auth-change'));
}

function isTokenExpired(config: GCSConfig): boolean {
  if (!config.expiresAt) return true;
  // Buffer of 5 minutes
  return Date.now() >= (config.expiresAt - 5 * 60 * 1000);
}

/**
 * Starts a background interval that proactively refreshes the token before it expires.
 * Checks every 5 minutes and refreshes if token will expire within 10 minutes.
 */
function startTokenRefreshMonitor(): void {
  // Clear any existing interval
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  // Check every 5 minutes
  tokenRefreshInterval = setInterval(async () => {
    const config = getGCSConfig();

    // Only monitor if we're enabled and have a token
    if (!config.enabled || !config.accessToken) {
      return;
    }

    // Check if token will expire within 10 minutes
    const tenMinutesFromNow = Date.now() + (10 * 60 * 1000);
    if (config.expiresAt && config.expiresAt < tenMinutesFromNow) {
      console.log('Proactively refreshing Google Drive token before expiration...');
      await getValidAccessToken();
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Stops the background token refresh monitor.
 * Exported to allow cleanup on app unmount.
 */
export function stopTokenRefreshMonitor(): void {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }
}

/**
 * Initializes the Google Token Client.
 * Should be called when the component mounts or when the user initiates connection.
 */
export function initializeGoogleAuth(onSuccess: () => void, onError: (err: string) => void): void {
  // Allow override if user wants to use their own client ID
  // const customClientId = localStorage.getItem('writer_sheet_gcs_custom_client_id');
  // const finalClientId = customClientId || CLIENT_ID;
  const finalClientId = CLIENT_ID;

  if (finalClientId === 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com') {
    onError('Please configure a valid Google Client ID in the settings or code.');
    return;
  }

  if (!window.google) {
    onError('Google Identity Services script not loaded. Please refresh the page.');
    return;
  }

  // Get stored email to use as hint for silent refresh (avoids account chooser popup)
  const existingConfig = getGCSConfig();

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: finalClientId,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.events',
    hint: existingConfig.userEmail, // Pre-select account for silent refresh
    callback: (response: TokenResponse) => {
      if (response.error) {
        if (refreshResolver) {
            refreshResolver(null);
            refreshResolver = null;
        }
        
        // If silent refresh failed, stop hammering the API
        if (response.error === 'interaction_required' || response.error === 'login_required') {
            console.warn("Background refresh failed (interaction required). Disabling auto-sync until manual login.");
            stopTokenRefreshMonitor();
            setGCSConfig({ enabled: false, accessToken: undefined });
        }
        
        onError(`Authorization failed: ${response.error}`);
        return;
      }

      if (response.access_token) {
        const expiresAt = Date.now() + (response.expires_in * 1000);

        // If we were waiting for a refresh, resolve it
        if (refreshResolver) {
            setGCSConfig({
                accessToken: response.access_token,
                expiresAt,
                enabled: true
            });
            refreshResolver(response.access_token);
            refreshResolver = null;
            return; // Skip profile fetch on silent refresh to save time/bandwidth
        }

        // Fetch user email to confirm identity (Only on initial login/prompt)
        fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${response.access_token}` }
        })
        .then(res => res.json())
        .then(userInfo => {
          setGCSConfig({
            accessToken: response.access_token,
            expiresAt,
            enabled: true,
            userEmail: userInfo.email
          });
          // Start proactive token refresh monitoring
          startTokenRefreshMonitor();
          onSuccess();
        })
        .catch((err) => {
          console.warn('Failed to fetch user info:', err);
          // Still save the token even if email fetch fails
          setGCSConfig({
            accessToken: response.access_token,
            expiresAt,
            enabled: true
          });
          // Start proactive token refresh monitoring
          startTokenRefreshMonitor();
          onSuccess();
        });
      }
    },
  });

  // If user is already logged in, start the token refresh monitor
  const config = getGCSConfig();
  if (config.enabled && config.accessToken) {
    startTokenRefreshMonitor();
  }
}

/**
 * Triggers the popup to request access.
 */
export function requestGoogleAccess(): void {
  if (!tokenClient) {
    console.error('Token client not initialized. Call initializeGoogleAuth first.');
    return;
  }
  tokenClient.requestAccessToken({ prompt: '' }); 
}

/**
 * Checks if we need to silently refresh the token (if expired) before an operation.
 * Returns the valid access token or null if we need user interaction.
 * Uses deduplication to prevent concurrent refresh requests.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const config = getGCSConfig();

  if (!config.enabled || !config.accessToken) return null;

  if (!isTokenExpired(config)) {
    return config.accessToken;
  }

  // If a refresh is already in progress, wait for it instead of starting another
  if (pendingRefreshPromise) {
    console.log("Token refresh already in progress, waiting...");
    return pendingRefreshPromise;
  }

  // Attempt silent refresh
  if (tokenClient) {
    console.log("Token expired. Attempting silent refresh...");

    pendingRefreshPromise = new Promise<string | null>((resolve) => {
      refreshResolver = resolve;

      // Use the stored email as a hint to skip account chooser completely
      // This helps Google do a truly silent refresh without showing any UI
      const refreshConfig: { prompt: string; hint?: string } = { prompt: 'none' };
      if (config.userEmail) {
        refreshConfig.hint = config.userEmail;
      }

      tokenClient!.requestAccessToken(refreshConfig);

      // Timeout after 5s if no response
      setTimeout(() => {
        if (refreshResolver) {
          console.warn("Silent refresh timed out.");
          refreshResolver(null);
          refreshResolver = null;
        }
        pendingRefreshPromise = null;
      }, 5000);
    }).finally(() => {
      // Clear the pending promise when done
      pendingRefreshPromise = null;
    });

    return pendingRefreshPromise;
  }

  return null;
}

export function setCustomClientId(clientId: string): void {
  localStorage.setItem('writer_sheet_gcs_custom_client_id', clientId);
  tokenClient = null; 
}

export function getCustomClientId(): string | null {
  return localStorage.getItem('writer_sheet_gcs_custom_client_id');
}

export function handleGoogleAuthCallback(): boolean {
  return false;
}

async function getOrCreateFolder(accessToken: string, folderName: string, parentId?: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
  try {
    const parentQuery = parentId ? `'${parentId}' in parents` : "'root' in parents";
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      `q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and ${parentQuery} and trashed=false&` +
      `fields=files(id,name)`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (searchResponse.status === 401) return { success: false, error: 'Unauthorized' };
    if (!searchResponse.ok) return { success: false, error: 'Failed to search for folder' };

    const searchResult = await searchResponse.json();

    if (searchResult.files && searchResult.files.length > 0) {
      return { success: true, folderId: searchResult.files[0].id };
    }

    const metadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
        metadata.parents = [parentId];
    }

    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!createResponse.ok) return { success: false, error: 'Failed to create folder' };

    const createResult = await createResponse.json();
    return { success: true, folderId: createResult.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function uploadResearchBackupGCS(books: BookProject[]): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    // Mark as backed up to prevent immediate retry loop (backoff)
    setGCSConfig({ lastBackup: new Date().toISOString() });
    console.warn('Auto-backup skipped due to expired session.');
    return { success: false, error: 'Session expired. Backup skipped.' };
  }

  try {
    const rootFolder = await getOrCreateFolder(accessToken, 'BookArchitect');
    if (!rootFolder.success || !rootFolder.folderId) {
      return { success: false, error: rootFolder.error || 'Failed to access root folder' };
    }

    const subFolder = await getOrCreateFolder(accessToken, 'Research', rootFolder.folderId);
    if (!subFolder.success || !subFolder.folderId) {
        return { success: false, error: subFolder.error || 'Failed to access Research folder' };
    }

    const allResearch = await getAllResearchData();

    const researchData: ResearchExportData = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      books: books.map(b => {
        const r = allResearch.find(res => res.bookId === b.id);
        return {
          id: b.id,
          title: b.title,
          themes: r?.themes || [],
          sources: r?.sources || [],
          researchCards: r?.cards || []
        };
      })
    };

    const content = JSON.stringify(researchData, null, 2);
    const fileName = `research-backup-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [subFolder.folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Research Upload failed:', error);
      return { success: false, error: `Upload failed: ${response.statusText}` };
    }

    return { success: true };
  } catch (e) {
    console.error('Research Upload error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function uploadToGCS(): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    // Mark as backed up to prevent immediate retry loop (backoff)
    setGCSConfig({ lastBackup: new Date().toISOString() });
    console.warn('Auto-backup skipped due to expired session.');
    return { success: false, error: 'Session expired. Backup skipped.' };
  }

  try {
    const rootFolder = await getOrCreateFolder(accessToken, 'BookArchitect');
    if (!rootFolder.success || !rootFolder.folderId) {
      return { success: false, error: rootFolder.error || 'Failed to access root folder' };
    }

    const subFolder = await getOrCreateFolder(accessToken, 'Books', rootFolder.folderId);
    if (!subFolder.success || !subFolder.folderId) {
        return { success: false, error: subFolder.error || 'Failed to access Books folder' };
    }

    const config = getGCSConfig();
    if (!config.folderId) {
      setGCSConfig({ folderId: rootFolder.folderId });
    }

    const data = await exportAllData();
    const content = JSON.stringify(data, null, 2);
    const fileName = `backup-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.json`;

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [subFolder.folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Upload failed:', error);
      return { success: false, error: `Upload failed: ${response.statusText}` };
    }

    setGCSConfig({ lastBackup: new Date().toISOString() });
    return { success: true };
  } catch (e) {
    console.error('Upload error:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function listGCSBackups(type: 'Books' | 'Research' = 'Books'): Promise<{ success: boolean; files?: any[]; error?: string }> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    return { success: false, error: 'Session expired. Please reconnect Google Drive.' };
  }

  try {
    const rootFolder = await getOrCreateFolder(accessToken, 'BookArchitect');
    if (!rootFolder.success || !rootFolder.folderId) {
      return { success: false, error: 'Failed to access root folder' };
    }

    const subFolder = await getOrCreateFolder(accessToken, type, rootFolder.folderId);
    if (!subFolder.success || !subFolder.folderId) {
        return { success: false, error: `Failed to access ${type} folder` };
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      `q='${subFolder.folderId}' in parents and mimeType='application/json' and trashed=false&` +
      `fields=files(id,name,createdTime,size)&` +
      `orderBy=createdTime desc`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      return { success: false, error: `Failed to list backups: ${response.statusText}` };
    }

    const result = await response.json();
    return { success: true, files: result.files || [] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function restoreFromGCS(fileId: string, type: 'Books' | 'Research' = 'Books'): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    return { success: false, error: 'Session expired. Please reconnect Google Drive.' };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Download failed:', response.status, errText);
      return { success: false, error: `Failed to download: ${response.status} ${response.statusText}` };
    }

    let data;
    try {
        data = await response.json();
    } catch (e) {
        console.error('Failed to parse backup JSON:', e);
        return { success: false, error: 'Backup file is corrupted or not valid JSON' };
    }

    let imported = false;
    
    if (type === 'Research') {
        imported = await importResearchData(data);
    } else {
        imported = await importAllData(data as ExportData);
    }

    if (imported) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to import data' };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteGCSBackup(fileId: string): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    return { success: false, error: 'Session expired. Please reconnect Google Drive.' };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      return { success: false, error: `Failed to delete: ${response.statusText}` };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export function disconnectGCS(): void {
  const config = getGCSConfig();

  // Stop the token refresh monitor
  stopTokenRefreshMonitor();

  // Revoke token if possible (optional but good practice)
  if (config.accessToken && window.google) {
    window.google.accounts.oauth2.revoke(config.accessToken, () => {
      console.log('Token revoked');
    });
  }

  setGCSConfig({
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined,
    enabled: false,
    lastBackup: undefined,
    userEmail: undefined,
    folderId: undefined
  });
}

export function shouldAutoBackup(): boolean {
  const config = getGCSConfig();

  if (!config.enabled || !config.autoBackup) {
    return false;
  }

  if (!config.lastBackup) {
    return true;
  }

  const lastBackupTime = new Date(config.lastBackup).getTime();
  const now = Date.now();
  const intervalMs = config.backupInterval * 60 * 1000;

  return (now - lastBackupTime) >= intervalMs;
}

// Wrapped versions that prevent concurrent uploads
// Use these in auto-save to avoid race conditions
export const uploadToGCSSafe = singleFlight(uploadToGCS);
export const uploadResearchBackupGCSSafe = singleFlight(uploadResearchBackupGCS);