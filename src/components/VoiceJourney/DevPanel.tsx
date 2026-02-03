// Voice Journey Dev Panel - For testing phase transitions and unlocks
import { useState } from 'react';
import { Settings, X, RefreshCw, FastForward } from 'lucide-react';
import { useProgressStore } from '../../store/useProgressStore';
import type { Phase } from '../../types/voice-journey';

export function DevPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    phase,
    getCurrentWeek,
    getCurrentDay,
    getDaysSinceStart,
    startDate,
    devModeEnabled,
    unlocked,
    stoneSessionsLog,
    writingSessionsLog,
    resonanceScores,
    forcePhase,
    forceDay,
    resetJourney,
    setDevMode,
  } = useProgressStore();

  const currentWeek = getCurrentWeek();
  const currentDay = getCurrentDay();
  const daysSinceStart = getDaysSinceStart();

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-purple-600 text-white rounded-full shadow-lg
                   hover:bg-purple-700 transition-colors"
        title="Voice Journey Dev Panel"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl
                        border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-purple-600 text-white">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="font-semibold">Voice Journey Dev</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Current Status */}
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="font-medium text-sm text-slate-600 dark:text-slate-300 mb-2">
                Current Status
              </h4>
              <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                <div>Phase: <span className="font-mono font-bold">{phase}</span></div>
                <div>Week: <span className="font-mono">{currentWeek}</span></div>
                <div>Day: <span className="font-mono">{currentDay}</span></div>
                <div>Days Since Start: <span className="font-mono">{daysSinceStart}</span></div>
                <div>Start Date: <span className="font-mono">{startDate || 'Not started'}</span></div>
                <div>Dev Mode: <span className={devModeEnabled ? 'text-amber-500' : 'text-green-500'}>{devModeEnabled ? 'ON' : 'OFF'}</span></div>
              </div>
            </div>

            {/* Session Counts */}
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="font-medium text-sm text-slate-600 dark:text-slate-300 mb-2">
                Session Data
              </h4>
              <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                <div>Stone Sessions: <span className="font-mono">{stoneSessionsLog.length}</span></div>
                <div>Writing Sessions: <span className="font-mono">{writingSessionsLog.length}</span></div>
                <div>Resonance Scores: <span className="font-mono">{resonanceScores.length}</span></div>
              </div>
            </div>

            {/* Unlocked Features */}
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
              <h4 className="font-medium text-sm text-slate-600 dark:text-slate-300 mb-2">
                Unlocked Features
              </h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(unlocked).map(([key, value]) => (
                  <span
                    key={key}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      value
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>

            {/* Phase Controls */}
            <div>
              <h4 className="font-medium text-sm text-slate-600 dark:text-slate-300 mb-2">
                Force Phase
              </h4>
              <div className="flex flex-wrap gap-2">
                {(['stone', 'transfer', 'application', 'autonomous'] as Phase[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => forcePhase(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      phase === p
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Day Controls */}
            <div>
              <h4 className="font-medium text-sm text-slate-600 dark:text-slate-300 mb-2">
                Force Day
              </h4>
              <div className="flex flex-wrap gap-2">
                {[1, 7, 8, 14, 21, 22, 49, 70, 84].map((day) => (
                  <button
                    key={day}
                    onClick={() => forceDay(day)}
                    className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 rounded
                               hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                  >
                    Day {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={resetJourney}
                className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2
                           bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg
                           hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Journey
              </button>

              <button
                onClick={() => setDevMode(!devModeEnabled)}
                className={`flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors ${
                  devModeEnabled
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FastForward className="w-3 h-3" />
                Dev Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DevPanel;
