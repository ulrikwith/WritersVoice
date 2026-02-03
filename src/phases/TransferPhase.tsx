// Transfer Phase - Weeks 2-3 Interface
// Focus: Transferring stone awareness to writing
// Features: Simple editor, engagement prompts, resonance tracking

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import {
  SimplifiedEditor,
  EngagementPrompt,
  ResonanceTracker,
  StoneCompanion,
} from '../components/VoiceJourney/writing';
import { useProgressStore } from '../store/useProgressStore';
import { usePromptsStore } from '../store/usePromptsStore';

export function TransferPhase() {
  const {
    getCurrentWeek,
    getWritingSessionsThisWeek,
    getAverageResonanceThisWeek,
    startWritingSession,
    endWritingSession,
    recordResonanceScore,
  } = useProgressStore();

  const {
    currentPrompt,
    isWritingSessionActive,
    promptsEnabled,
    startWritingSession: startPromptSession,
    endWritingSession: endPromptSession,
    dismissPrompt,
    checkAndShowPrompt,
    scheduleNextPrompt,
  } = usePromptsStore();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showResonanceTracker, setShowResonanceTracker] = useState(false);
  const [sessionWordCount, setSessionWordCount] = useState(0);
  const [content, setContent] = useState('');
  const promptCheckRef = useRef<number | null>(null);

  const currentWeek = getCurrentWeek();
  const sessionsThisWeek = getWritingSessionsThisWeek();
  const averageResonance = getAverageResonanceThisWeek();

  // Start prompt scheduling when session starts
  const handleSessionStart = useCallback(() => {
    const id = startWritingSession();
    setSessionId(id);
    startPromptSession();
    scheduleNextPrompt(currentWeek);

    // Start checking for prompts every 30 seconds
    promptCheckRef.current = window.setInterval(() => {
      checkAndShowPrompt(currentWeek);
    }, 30000);
  }, [
    startWritingSession,
    startPromptSession,
    scheduleNextPrompt,
    checkAndShowPrompt,
    currentWeek,
  ]);

  // End session and show resonance tracker
  const handleSessionEnd = useCallback(
    (wordCount: number) => {
      setSessionWordCount(wordCount);

      if (sessionId) {
        endWritingSession(sessionId, wordCount);
      }

      endPromptSession();

      if (promptCheckRef.current) {
        clearInterval(promptCheckRef.current);
        promptCheckRef.current = null;
      }

      // Show resonance tracker
      setShowResonanceTracker(true);
    },
    [sessionId, endWritingSession, endPromptSession]
  );

  // Handle resonance score
  const handleResonanceComplete = useCallback(
    (score: number) => {
      if (sessionId) {
        recordResonanceScore(sessionId, score);
      }
      setShowResonanceTracker(false);
      setSessionId(null);
      // Optionally reset content for new session
      // setContent('');
    },
    [sessionId, recordResonanceScore]
  );

  // Skip resonance tracking
  const handleResonanceSkip = useCallback(() => {
    setShowResonanceTracker(false);
    setSessionId(null);
  }, []);

  // Handle prompt dismissal
  const handlePromptDismiss = useCallback(() => {
    dismissPrompt();
    // Schedule next prompt
    scheduleNextPrompt(currentWeek);
  }, [dismissPrompt, scheduleNextPrompt, currentWeek]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (promptCheckRef.current) {
        clearInterval(promptCheckRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header
        className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
                         border-b border-stone-200 dark:border-slate-700"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Stone Companion */}
              <StoneCompanion size="medium" />

              <div>
                <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100">
                  Week {currentWeek}: Stone Meets Pen
                </h1>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Transfer Phase
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-slate-800 rounded-full">
                <Calendar className="w-4 h-4 text-stone-500" />
                <span className="text-sm text-stone-600 dark:text-stone-300">
                  {sessionsThisWeek}/7 sessions
                </span>
              </div>

              {averageResonance > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-600 dark:text-blue-300">
                    {averageResonance.toFixed(1)} avg resonance
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Pre-writing prompt */}
          {!isWritingSessionActive && !showResonanceTracker && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🪨</span>
                <h3 className="font-semibold text-stone-800 dark:text-stone-100">
                  Before You Begin
                </h3>
              </div>
              <p className="text-stone-600 dark:text-stone-400 mb-4">
                Take a moment with your stone. Feel the quality of awareness you developed
                in Week 1. Bring that same sensing quality to your fingertips as you write.
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400 italic">
                Click the stone icon anytime during writing to return to this grounded state.
              </p>
            </div>
          )}

          {/* Editor Card */}
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg
                          border border-stone-200 dark:border-slate-700"
          >
            {showResonanceTracker ? (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <span className="text-4xl mb-2 block">✨</span>
                  <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">
                    Session Complete
                  </h3>
                  <p className="text-stone-600 dark:text-stone-400 mt-1">
                    {sessionWordCount} words written
                  </p>
                </div>

                <ResonanceTracker
                  onComplete={handleResonanceComplete}
                  onSkip={handleResonanceSkip}
                />
              </div>
            ) : (
              <SimplifiedEditor
                initialContent={content}
                maxDuration={20}
                onContentChange={setContent}
                onSessionStart={handleSessionStart}
                onSessionEnd={handleSessionEnd}
                placeholder="Begin writing. Feel your fingers on the keys..."
              />
            )}
          </div>

          {/* Writing guidance */}
          {!isWritingSessionActive && !showResonanceTracker && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-stone-200 dark:border-slate-700">
              <h3 className="font-semibold text-stone-800 dark:text-stone-100 mb-3">
                What to Write
              </h3>
              <p className="text-stone-600 dark:text-stone-400 mb-4">
                Write about anything. The content doesn't matter yet—what matters is the
                quality of attention you bring. Notice:
              </p>
              <ul className="space-y-2 text-stone-600 dark:text-stone-400">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Your fingers finding the keys
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  The space between thought and word
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Where sentences "land" in your body
                </li>
              </ul>

              <p className="mt-4 text-sm text-stone-500 dark:text-stone-400 italic">
                Prompts will appear every 5 minutes to help maintain this awareness.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Engagement Prompt Overlay */}
      {currentPrompt && promptsEnabled && (
        <EngagementPrompt prompt={currentPrompt} onDismiss={handlePromptDismiss} />
      )}
    </div>
  );
}

export default TransferPhase;
