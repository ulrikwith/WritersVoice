// Engagement Prompt - Popup overlay for voice development prompts
import { useState, useEffect } from 'react';
import type { EngagementPrompt as PromptType } from '../../../types/voice-journey';

interface EngagementPromptProps {
  prompt: PromptType;
  onDismiss: () => void;
  minDisplayTime?: number; // ms before can dismiss, default 2000
}

export function EngagementPrompt({
  prompt,
  onDismiss,
  minDisplayTime = 2000,
}: EngagementPromptProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const [timeLeft, setTimeLeft] = useState(minDisplayTime / 1000);

  // Timer for minimum display time
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          setCanDismiss(true);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    const timeout = setTimeout(() => {
      setCanDismiss(true);
    }, minDisplayTime);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [minDisplayTime]);

  // Get icon based on prompt type
  const getIcon = () => {
    switch (prompt.type) {
      case 'anchor':
        return '🪨';
      case 'sensation':
        return '✋';
      case 'resonance':
        return '💫';
      case 'awareness':
        return '👁️';
      default:
        return '✨';
    }
  };

  // Get background color based on prompt type
  const getBgColor = () => {
    switch (prompt.type) {
      case 'anchor':
        return 'bg-amber-50 dark:bg-amber-900/20';
      case 'sensation':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'resonance':
        return 'bg-purple-50 dark:bg-purple-900/20';
      case 'awareness':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-stone-50 dark:bg-slate-700';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50
                 flex items-center justify-center
                 animate-in fade-in duration-300"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
                   max-w-md mx-4 overflow-hidden
                   animate-in zoom-in-95 duration-300"
      >
        {/* Icon header */}
        <div className={`${getBgColor()} p-6 flex justify-center`}>
          <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full
                          flex items-center justify-center shadow-inner">
            <span className="text-3xl">{getIcon()}</span>
          </div>
        </div>

        {/* Prompt content */}
        <div className="p-6">
          <p className="text-lg text-stone-800 dark:text-stone-100 text-center leading-relaxed mb-4">
            {prompt.message}
          </p>

          <p className="text-sm text-stone-500 dark:text-stone-400 text-center italic mb-6">
            Take a moment. Just notice. Then continue.
          </p>

          {/* Continue button */}
          <button
            onClick={canDismiss ? onDismiss : undefined}
            disabled={!canDismiss}
            className={`w-full py-3 rounded-lg font-medium transition-all
                       ${
                         canDismiss
                           ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200 cursor-pointer'
                           : 'bg-stone-200 dark:bg-slate-600 text-stone-400 dark:text-slate-400 cursor-not-allowed'
                       }`}
          >
            {canDismiss ? (
              'Continue Writing'
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>Take a moment...</span>
                <span className="text-xs">
                  ({Math.ceil(timeLeft)}s)
                </span>
              </span>
            )}
          </button>
        </div>

        {/* Progress bar at bottom */}
        {!canDismiss && (
          <div className="h-1 bg-stone-100 dark:bg-slate-700">
            <div
              className="h-full bg-stone-400 dark:bg-stone-500 transition-all duration-100"
              style={{
                width: `${((minDisplayTime / 1000 - timeLeft) / (minDisplayTime / 1000)) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default EngagementPrompt;
