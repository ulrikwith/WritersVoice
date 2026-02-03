// Resonance Tracker - Post-session rating for voice resonance
import { useState } from 'react';
import { HelpCircle, Check, X } from 'lucide-react';

interface ResonanceTrackerProps {
  onComplete: (score: number) => void;
  onSkip?: () => void;
}

export function ResonanceTracker({ onComplete, onSkip }: ResonanceTrackerProps) {
  const [score, setScore] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = () => {
    if (score !== null) {
      setIsAnimating(true);
      setTimeout(() => {
        onComplete(score);
      }, 300);
    }
  };

  const getScoreLabel = (num: number): string => {
    if (num <= 2) return "Didn't land";
    if (num <= 4) return 'Somewhat distant';
    if (num <= 6) return 'Partially resonant';
    if (num <= 8) return 'Mostly resonant';
    return 'Deeply resonant';
  };

  return (
    <div
      className={`bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20
                  rounded-2xl p-6 border border-blue-200 dark:border-blue-800
                  animate-in slide-in-from-bottom-4 duration-400
                  ${isAnimating ? 'opacity-0 transition-opacity duration-300' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
            How much did that resonate?
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Not "was it good?" – did it <em>land</em>?
          </p>
        </div>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Explanation panel */}
      {showExplanation && (
        <div className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-blue-800">
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
            Resonance isn't about quality or correctness. It's about{' '}
            <strong>felt truth</strong>. Did you feel what you wrote? Did the words land
            somewhere in your body? Your body knows the answer before your mind does.
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 italic">
            Low scores aren't failures—they're data. Some sessions just don't land.
            That's part of the process.
          </p>
        </div>
      )}

      {/* 1-10 Scale */}
      <div className="grid grid-cols-10 gap-1.5 mb-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
          <button
            key={num}
            onClick={() => setScore(num)}
            className={`aspect-square py-2 rounded-lg border-2 transition-all duration-200
                       font-semibold text-sm
                       ${
                         score === num
                           ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-lg'
                           : 'bg-white dark:bg-slate-800 border-stone-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 hover:scale-105 text-stone-700 dark:text-stone-300'
                       }`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Scale Labels */}
      <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mb-4 px-1">
        <span>Didn't land</span>
        <span>Deeply resonant</span>
      </div>

      {/* Selected score feedback */}
      {score !== null && (
        <div className="mb-4 text-center">
          <span className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium">
            {getScoreLabel(score)}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex items-center justify-center gap-2 px-4 py-3
                       text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200
                       transition-colors"
          >
            <X className="w-4 h-4" />
            Skip
          </button>
        )}

        <button
          onClick={handleSubmit}
          disabled={score === null}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg
                     font-medium transition-all
                     ${
                       score !== null
                         ? 'bg-blue-600 text-white hover:bg-blue-700'
                         : 'bg-stone-200 dark:bg-slate-700 text-stone-400 dark:text-slate-500 cursor-not-allowed'
                     }`}
        >
          <Check className="w-5 h-5" />
          Save & Continue
        </button>
      </div>
    </div>
  );
}

export default ResonanceTracker;
