// Stone Practice Timer - 5-minute countdown timer for stone practice
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check } from 'lucide-react';

interface StoneTimerProps {
  duration?: number; // in seconds, default 5 minutes (300 seconds)
  onComplete: (actualDuration: number) => void;
  onCancel?: () => void;
}

export function StoneTimer({
  duration = 300,
  onComplete,
  onCancel,
}: StoneTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Calculate actual elapsed time
  const actualDuration = duration - timeLeft;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = ((duration - timeLeft) / duration) * 100;

  // Start the timer
  const start = useCallback(() => {
    if (isCompleted) return;
    setIsRunning(true);
    startTimeRef.current = Date.now();
  }, [isCompleted]);

  // Pause the timer
  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reset the timer
  const reset = useCallback(() => {
    pause();
    setTimeLeft(duration);
    setIsCompleted(false);
    startTimeRef.current = null;
  }, [duration, pause]);

  // Complete early (min 3 minutes to count)
  const completeEarly = useCallback(() => {
    if (actualDuration >= 180) {
      // At least 3 minutes
      pause();
      setIsCompleted(true);
      onComplete(actualDuration);
    }
  }, [actualDuration, pause, onComplete]);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            onComplete(duration);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, duration, onComplete]);

  // Play a gentle sound on completion
  useEffect(() => {
    if (isCompleted && timeLeft === 0) {
      // Could add a bell sound here
      // For now, we'll just rely on the visual
    }
  }, [isCompleted, timeLeft]);

  if (isCompleted) {
    return (
      <div className="text-center py-8">
        <div className="w-24 h-24 mx-auto mb-6 bg-green-100 dark:bg-green-900/30
                        rounded-full flex items-center justify-center">
          <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
          Practice Complete
        </h3>
        <p className="text-stone-600 dark:text-stone-400 mb-6">
          {formatTime(actualDuration)} of focused awareness
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto px-6 py-3
                     text-stone-600 dark:text-stone-300
                     hover:text-stone-800 dark:hover:text-stone-100 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Practice Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8">
      {/* Timer Circle */}
      <div className="relative w-48 h-48 mb-8">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-stone-200 dark:text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.83} 283`}
            className="text-amber-500 transition-all duration-1000"
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-stone-800 dark:text-stone-100 font-mono">
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {isRunning ? 'Sensing...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Stone Icon Animation */}
      {isRunning && (
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-stone-400 to-stone-600
                          flex items-center justify-center animate-pulse">
            <span className="text-2xl">🪨</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isRunning && timeLeft === duration && (
        <p className="text-center text-stone-600 dark:text-stone-400 mb-6 max-w-sm">
          Hold your stone gently. Close your eyes. Feel the texture against your fingertips.
        </p>
      )}

      {isRunning && (
        <p className="text-center text-stone-600 dark:text-stone-400 mb-6 max-w-sm italic">
          Feel the stone... your fingers sensing... awareness of sensing...
        </p>
      )}

      {/* Control Buttons */}
      <div className="flex items-center gap-4">
        {!isRunning ? (
          <button
            onClick={start}
            className="flex items-center gap-2 px-8 py-4 bg-stone-800 dark:bg-stone-100
                       text-white dark:text-stone-900 rounded-full font-semibold
                       hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors
                       shadow-lg"
          >
            <Play className="w-5 h-5" />
            {timeLeft < duration ? 'Resume' : 'Begin Practice'}
          </button>
        ) : (
          <>
            <button
              onClick={pause}
              className="flex items-center gap-2 px-6 py-3
                         border border-stone-300 dark:border-slate-600
                         text-stone-700 dark:text-stone-300 rounded-full
                         hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Pause className="w-5 h-5" />
              Pause
            </button>

            {actualDuration >= 180 && (
              <button
                onClick={completeEarly}
                className="flex items-center gap-2 px-6 py-3
                           bg-green-600 text-white rounded-full
                           hover:bg-green-700 transition-colors"
              >
                <Check className="w-5 h-5" />
                Complete
              </button>
            )}
          </>
        )}

        {timeLeft < duration && !isRunning && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-3
                       text-stone-500 dark:text-stone-400
                       hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Cancel option */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-6 text-sm text-stone-500 dark:text-stone-400
                     hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

export default StoneTimer;
