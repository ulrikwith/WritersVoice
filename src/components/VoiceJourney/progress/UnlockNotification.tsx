// Unlock Notification - Celebratory notification when features unlock
import { useState, useEffect, useMemo } from 'react';
import { X, Unlock, Sparkles } from 'lucide-react';
import type { FeatureUnlock } from '../../../utils/phaseUnlock';

// Pre-generate confetti positions to avoid Math.random() during render
function generateConfettiPositions(count: number) {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 0.5 + Math.random() * 0.5,
  }));
}

interface UnlockNotificationProps {
  unlocks: FeatureUnlock[];
  onDismiss: () => void;
}

export function UnlockNotification({ unlocks, onDismiss }: UnlockNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Generate confetti positions once on mount
  const confettiPositions = useMemo(() => generateConfettiPositions(20), []);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleNext = () => {
    if (currentIndex < unlocks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDismiss();
    }
  };

  if (unlocks.length === 0) return null;

  const currentUnlock = unlocks[currentIndex];

  // Get icon component
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'edit':
        return '✏️';
      case 'layers':
        return '📚';
      case 'infinity':
        return '♾️';
      case 'book-open':
        return '📖';
      case 'users':
        return '👥';
      case 'download':
        return '📥';
      case 'award':
        return '🏆';
      default:
        return '✨';
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50
                  flex items-center justify-center p-4
                  transition-opacity duration-300
                  ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
                    max-w-md w-full overflow-hidden
                    transition-all duration-300
                    ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        {/* Celebration header */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 p-6 text-white text-center relative overflow-hidden">
          {/* Confetti effect */}
          <div className="absolute inset-0 pointer-events-none">
            {confettiPositions.map((pos, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  animationDelay: `${pos.delay}s`,
                  animationDuration: `${pos.duration}s`,
                }}
              >
                <Sparkles className="w-3 h-3 text-white/60" />
              </div>
            ))}
          </div>

          <Unlock className="w-10 h-10 mx-auto mb-3" />
          <h2 className="text-2xl font-bold">Feature Unlocked!</h2>
          {unlocks.length > 1 && (
            <p className="text-sm opacity-80 mt-1">
              {currentIndex + 1} of {unlocks.length}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="text-5xl mb-4">{getIcon(currentUnlock.icon)}</div>
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">
            {currentUnlock.feature}
          </h3>
          <p className="text-stone-600 dark:text-stone-400">
            {currentUnlock.description}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-slate-700">
          <button
            onClick={handleNext}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500
                       text-white rounded-lg font-semibold
                       hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            {currentIndex < unlocks.length - 1 ? 'Next Unlock' : 'Continue Writing'}
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-white/80 hover:text-white
                     hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default UnlockNotification;
