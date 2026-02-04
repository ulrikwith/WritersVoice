// Blue.cc Settings Component
// Connection configuration and status display

import { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  Loader,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useBlueStore } from '../../store/useBlueStore';
import type { BlueConfig } from '../../services/bluecc/types';

interface BlueSettingsProps {
  onClose?: () => void;
}

export function BlueSettings({ onClose: _onClose }: BlueSettingsProps) {
  // onClose is optional - component can be embedded or used as modal
  void _onClose; // Intentionally unused for now
  const {
    connectionStatus,
    connectionError,
    userId,
    config,
    syncStatus,
    lastSyncTime,
    currentPhase,
    connect,
    disconnect,
    syncAll,
  } = useBlueStore();

  // Initialize token values from config or environment
  const getInitialTokenId = () => {
    if (config?.tokenId) return config.tokenId;
    const envTokenId = import.meta.env.VITE_BLUE_TOKEN_ID;
    if (envTokenId && envTokenId !== 'your_blue_token_id') return envTokenId;
    return '';
  };

  const getInitialTokenSecret = () => {
    if (config?.secretId) return config.secretId;
    const envTokenSecret = import.meta.env.VITE_BLUE_TOKEN_SECRET;
    if (envTokenSecret && envTokenSecret !== 'your_blue_token_secret') return envTokenSecret;
    return '';
  };

  const [tokenId, setTokenId] = useState(getInitialTokenId);
  const [tokenSecret, setTokenSecret] = useState(getInitialTokenSecret);
  const [showSecret, setShowSecret] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [shouldAutoConnect, setShouldAutoConnect] = useState(
    () => Boolean(config && connectionStatus === 'disconnected')
  );

  const handleConnect = async () => {
    if (!tokenId || !tokenSecret) {
      return;
    }

    setIsConnecting(true);

    const blueConfig: BlueConfig = {
      tokenId,
      secretId: tokenSecret,
      // Domain-specific list IDs for BookArchitect V2
      // If not set in env, lists will be auto-created with standard names
      journeyListId: import.meta.env.VITE_BLUE_JOURNEY_LIST_ID || undefined,
      booksListId: import.meta.env.VITE_BLUE_BOOKS_LIST_ID || undefined,
      cohortListId: import.meta.env.VITE_BLUE_COMMUNITY_LIST_ID || undefined,
    };

    const success = await connect(blueConfig);

    if (success) {
      await syncAll();
    }

    setIsConnecting(false);
  };

  // Handle auto-connect after handleConnect is defined
  useEffect(() => {
    const autoConnect = async () => {
      if (shouldAutoConnect && tokenId && tokenSecret) {
        setShouldAutoConnect(false);
        setIsConnecting(true);

        const blueConfig: BlueConfig = {
          tokenId,
          secretId: tokenSecret,
          journeyListId: import.meta.env.VITE_BLUE_JOURNEY_LIST_ID || undefined,
          booksListId: import.meta.env.VITE_BLUE_BOOKS_LIST_ID || undefined,
          cohortListId: import.meta.env.VITE_BLUE_COMMUNITY_LIST_ID || undefined,
        };

        const success = await connect(blueConfig);
        if (success) {
          await syncAll();
        }

        setIsConnecting(false);
      }
    };

    autoConnect();
  }, [shouldAutoConnect, tokenId, tokenSecret, connect, syncAll]);

  const handleDisconnect = () => {
    disconnect();
  };

  const handleSync = async () => {
    await syncAll();
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-amber-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5" />;
      case 'connecting':
        return <Loader className="w-5 h-5 animate-spin" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      default:
        return <CloudOff className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Cloud className="w-6 h-6 text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Blue.cc Cloud Sync
          </h2>
        </div>
        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm capitalize">{connectionStatus}</span>
        </div>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'connected' && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700 dark:text-green-300">Connected</span>
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>

          <div className="text-xs text-green-600 dark:text-green-400 space-y-1">
            {userId && <div>User ID: {userId.substring(0, 8)}...</div>}
            {currentPhase && <div>Voice Journey: {currentPhase} phase</div>}
            {lastSyncTime && (
              <div>Last sync: {new Date(lastSyncTime).toLocaleString()}</div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            className="mt-3 w-full py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Error Display */}
      {connectionStatus === 'error' && connectionError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-700 dark:text-red-300 mb-2">
            Connection Error
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">
            {connectionError}
          </div>
        </div>
      )}

      {/* Connection Form */}
      {connectionStatus !== 'connected' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Connect to Blue.cc to sync your voice journey progress and books across devices.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Token ID
            </label>
            <input
              type="text"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
              placeholder="Enter your Blue.cc Token ID"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Token Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={tokenSecret}
                onChange={(e) => setTokenSecret(e.target.value)}
                placeholder="Enter your Blue.cc Token Secret"
                className="w-full px-3 py-2 pr-10 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Get your API tokens from{' '}
            <a
              href="https://blue.cc/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              blue.cc/settings/api
            </a>
          </div>

          <button
            onClick={handleConnect}
            disabled={!tokenId || !tokenSecret || isConnecting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                Connect to Blue.cc
              </>
            )}
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          What gets synced?
        </h3>
        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <li>• Voice Journey progress and phase transitions</li>
          <li>• Stone session completions and notes</li>
          <li>• Writing session metrics and resonance scores</li>
          <li>• Book and chapter structure (not full content)</li>
          <li>• Feature unlock progress</li>
        </ul>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Full chapter content is stored in Google Drive for better performance.
        </p>
      </div>
    </div>
  );
}

export default BlueSettings;
