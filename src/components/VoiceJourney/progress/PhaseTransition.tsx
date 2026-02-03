// Phase Transition - Celebration modal when moving to a new phase
import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { Phase } from '../../../types/voice-journey';
import { getPhaseName, getPhaseDescription } from '../../../utils/phaseUnlock';

interface PhaseTransitionProps {
  fromPhase: Phase;
  toPhase: Phase;
  onContinue: () => void;
}

// Pre-generate sparkle positions to avoid Math.random() during render
function generateSparklePositions(count: number) {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 1 + Math.random() * 2,
  }));
}

export function PhaseTransition({
  fromPhase,
  toPhase,
  onContinue,
}: PhaseTransitionProps) {
  const [step, setStep] = useState<'celebrate' | 'explain'>('celebrate');
  const [isVisible, setIsVisible] = useState(false);

  // Generate sparkle positions once on mount
  const sparklePositions = useMemo(() => generateSparklePositions(30), []);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (step === 'celebrate') {
      setStep('explain');
    } else {
      setIsVisible(false);
      setTimeout(onContinue, 300);
    }
  };

  // Get phase-specific styles (static classes for Tailwind CSS purging)
  const getPhaseStyles = (phase: Phase) => {
    switch (phase) {
      case 'stone':
        return {
          gradient: 'bg-gradient-to-br from-amber-400 to-stone-600',
          button: 'bg-gradient-to-r from-amber-400 to-stone-600',
        };
      case 'transfer':
        return {
          gradient: 'bg-gradient-to-br from-blue-400 to-purple-600',
          button: 'bg-gradient-to-r from-blue-400 to-purple-600',
        };
      case 'application':
        return {
          gradient: 'bg-gradient-to-br from-purple-400 to-indigo-600',
          button: 'bg-gradient-to-r from-purple-400 to-indigo-600',
        };
      case 'autonomous':
        return {
          gradient: 'bg-gradient-to-br from-green-400 to-emerald-600',
          button: 'bg-gradient-to-r from-green-400 to-emerald-600',
        };
    }
  };

  // Get phase icon
  const getPhaseIcon = (phase: Phase) => {
    switch (phase) {
      case 'stone':
        return '🪨';
      case 'transfer':
        return '✍️';
      case 'application':
        return '📖';
      case 'autonomous':
        return '🚀';
    }
  };

  const phaseStyles = getPhaseStyles(toPhase);

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                  flex items-center justify-center p-4
                  transition-opacity duration-500
                  ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
                    max-w-lg w-full overflow-hidden
                    transition-all duration-500
                    ${isVisible ? 'scale-100' : 'scale-90'}`}
      >
        {step === 'celebrate' ? (
          <>
            {/* Celebration View */}
            <div
              className={`${phaseStyles.gradient} p-8 text-white text-center relative overflow-hidden`}
            >
              {/* Floating sparkles */}
              <div className="absolute inset-0 pointer-events-none">
                {sparklePositions.map((pos, i) => (
                  <div
                    key={i}
                    className="absolute animate-pulse"
                    style={{
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      animationDelay: `${pos.delay}s`,
                      animationDuration: `${pos.duration}s`,
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-white/40" />
                  </div>
                ))}
              </div>

              <div className="text-6xl mb-4 animate-bounce">
                {getPhaseIcon(toPhase)}
              </div>
              <h2 className="text-3xl font-bold mb-2">Phase Complete!</h2>
              <p className="opacity-90">
                You've finished the {getPhaseName(fromPhase)}
              </p>
            </div>

            <div className="p-6 text-center">
              <h3 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-2">
                Moving to: {getPhaseName(toPhase)}
              </h3>
              <p className="text-stone-600 dark:text-stone-400">
                Your voice is developing. New capabilities await.
              </p>
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-slate-700">
              <button
                onClick={handleContinue}
                className={`w-full py-3 ${phaseStyles.button}
                           text-white rounded-lg font-semibold
                           hover:shadow-lg transition-all flex items-center justify-center gap-2`}
              >
                See What's New
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Explanation View */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-16 h-16 ${phaseStyles.gradient}
                              rounded-xl flex items-center justify-center text-3xl`}
                >
                  {getPhaseIcon(toPhase)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">
                    {getPhaseName(toPhase)}
                  </h2>
                  <p className="text-stone-500 dark:text-stone-400">
                    Phase {['stone', 'transfer', 'application', 'autonomous'].indexOf(toPhase) + 1} of 4
                  </p>
                </div>
              </div>

              <p className="text-stone-600 dark:text-stone-400 mb-6">
                {getPhaseDescription(toPhase)}
              </p>

              {/* What's unlocking */}
              <div className="bg-stone-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6">
                <h4 className="font-medium text-stone-800 dark:text-stone-100 mb-3">
                  What's New in This Phase:
                </h4>
                <ul className="space-y-2 text-stone-600 dark:text-stone-400 text-sm">
                  {getPhaseFeatures(toPhase).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 dark:border-slate-700">
              <button
                onClick={handleContinue}
                className={`w-full py-3 ${phaseStyles.button}
                           text-white rounded-lg font-semibold
                           hover:shadow-lg transition-all flex items-center justify-center gap-2`}
              >
                Let's Go
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getPhaseFeatures(phase: Phase): string[] {
  switch (phase) {
    case 'stone':
      return [
        'Stone practice timer (5 minutes)',
        'Daily reflection journal',
        '7-day progress tracking',
      ];
    case 'transfer':
      return [
        'Simple text editor unlocked',
        'Engagement prompts every 5 minutes',
        'Resonance tracking after sessions',
        'Stone companion for grounding',
      ];
    case 'application':
      return [
        'Multiple chapters (up to 5, then unlimited)',
        'Chapter management tools',
        'Reflection workspace (Week 7)',
        'Export & community features (Week 10)',
      ];
    case 'autonomous':
      return [
        'Full BookArchitect access',
        'All features unlocked',
        'Optional micro-engagement prompts',
        'Voice development analytics',
      ];
  }
}

export default PhaseTransition;
