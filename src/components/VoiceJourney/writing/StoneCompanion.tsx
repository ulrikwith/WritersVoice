// Stone Companion - Persistent stone icon that opens quick practice modal
import { useState } from 'react';
import { X } from 'lucide-react';
import { StoneTimer } from '../stone/StoneTimer';

interface StoneCompanionProps {
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

export function StoneCompanion({
  size = 'medium',
  showTooltip = true,
}: StoneCompanionProps) {
  const [showModal, setShowModal] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const sizeClasses = {
    small: 'w-8 h-8 text-lg',
    medium: 'w-10 h-10 text-xl',
    large: 'w-12 h-12 text-2xl',
  };

  const handlePracticeComplete = () => {
    // Just close the modal - this is a quick grounding session
    setShowModal(false);
  };

  return (
    <>
      {/* Stone Icon Button */}
      <div className="relative">
        <button
          onClick={() => setShowModal(true)}
          onMouseEnter={() => setShowHint(true)}
          onMouseLeave={() => setShowHint(false)}
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-stone-400 to-stone-600
                      flex items-center justify-center shadow-md
                      hover:from-stone-500 hover:to-stone-700 hover:shadow-lg
                      transition-all duration-200 hover:scale-105`}
        >
          <span>🪨</span>
        </button>

        {/* Tooltip */}
        {showTooltip && showHint && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2
                        px-3 py-1.5 bg-stone-800 dark:bg-stone-100
                        text-white dark:text-stone-900 text-xs rounded-lg
                        whitespace-nowrap shadow-lg z-10
                        animate-in fade-in duration-200"
          >
            Quick grounding practice
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2
                            bg-stone-800 dark:bg-stone-100 rotate-45" />
          </div>
        )}
      </div>

      {/* Practice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                        flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
                          max-w-md w-full overflow-hidden
                          animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🪨</span>
                <div>
                  <h3 className="font-semibold text-stone-800 dark:text-stone-100">
                    Quick Grounding
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    3-minute stone practice
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200
                           hover:bg-stone-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Timer */}
            <div className="p-6">
              <p className="text-center text-stone-600 dark:text-stone-400 mb-4">
                Return to the stone for a moment. Feel the same quality you're bringing to your writing.
              </p>

              <StoneTimer
                duration={180} // 3 minutes for quick session
                onComplete={handlePracticeComplete}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StoneCompanion;
