// Commitment Screen - Users commit to the 12-week journey
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Calendar, Target, AlertTriangle } from 'lucide-react';

interface CommitmentScreenProps {
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  isExistingUser?: boolean;
}

export function CommitmentScreen({
  onNext,
  onBack,
  onSkip,
  isExistingUser = false,
}: CommitmentScreenProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onNext();
    }, 300);
  };

  const handleSkip = () => {
    if (onSkip) {
      setShowSkipWarning(true);
    }
  };

  const confirmSkip = () => {
    if (onSkip) {
      setIsAnimating(true);
      setTimeout(() => {
        onSkip();
      }, 300);
    }
  };

  // Calculate end date (12 weeks from today)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 84);
  const endDateStr = endDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 dark:from-slate-900 dark:to-slate-800
                  flex flex-col items-center px-6 py-12
                  transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-6xl mb-4 block">🎯</span>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100 mb-4">
          Your Commitment
        </h1>
        <p className="text-lg text-stone-600 dark:text-stone-300 max-w-xl">
          This journey takes 12 weeks. Features unlock progressively as you develop capacity.
        </p>
      </div>

      {/* Commitment Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg max-w-2xl w-full mb-8
                      border border-stone-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6 text-center">
          What You're Committing To
        </h2>

        <div className="space-y-4">
          <CommitmentItem
            icon={<Calendar className="w-5 h-5" />}
            title="12 weeks"
            description={`Your journey completes around ${endDateStr}`}
          />

          <CommitmentItem
            icon={<Target className="w-5 h-5" />}
            title="10-20 minutes daily"
            description="Week 1: Two 5-minute stone sessions. Weeks 2+: 15-20 minute writing sessions"
          />

          <CommitmentItem
            icon={<span className="text-lg">🪨</span>}
            title="Trust the process"
            description="Features unlock when you're ready. The structure IS the teaching."
          />
        </div>

        {/* Timeline Preview */}
        <div className="mt-8 space-y-3">
          <h3 className="font-medium text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wide">
            Your Journey Timeline
          </h3>
          <div className="flex gap-1">
            <TimelineBlock label="Stone" weeks="1" color="bg-amber-500" />
            <TimelineBlock label="Transfer" weeks="2-3" color="bg-blue-500" />
            <TimelineBlock label="Application" weeks="4-12" color="bg-purple-500" wide />
            <TimelineBlock label="Free" weeks="13+" color="bg-green-500" />
          </div>
        </div>

        {/* Key principle */}
        <div className="mt-8 p-4 bg-stone-100 dark:bg-slate-700 rounded-lg text-center">
          <p className="text-stone-700 dark:text-stone-300 font-medium">
            "You can't skip ahead—you must develop capacity before accessing advanced features."
          </p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-4 max-w-2xl w-full px-4">
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 text-stone-600 dark:text-stone-300
                       hover:text-stone-800 dark:hover:text-stone-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-full text-lg font-semibold
                       bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900
                       hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors shadow-lg"
          >
            I'm Ready to Commit
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Skip option for existing users */}
        {isExistingUser && onSkip && (
          <button
            onClick={handleSkip}
            className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200
                       transition-colors py-2"
          >
            Skip the journey and keep full access
          </button>
        )}
      </div>

      {/* Skip Warning Modal */}
      {showSkipWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-semibold">Are you sure?</h3>
            </div>

            <p className="text-stone-600 dark:text-stone-300 mb-6">
              By skipping the journey, you'll have full access to BookArchitect but miss the
              voice development experience. This choice cannot be undone.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setShowSkipWarning(false)}
                className="w-full py-3 px-6 bg-stone-800 dark:bg-stone-100
                           text-white dark:text-stone-900 rounded-lg font-medium
                           hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
              >
                Take the Journey Instead
              </button>

              <button
                onClick={confirmSkip}
                className="w-full py-3 px-6 border border-stone-300 dark:border-slate-600
                           text-stone-600 dark:text-stone-300 rounded-lg font-medium
                           hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors"
              >
                Skip and Use Full BookArchitect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CommitmentItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function CommitmentItem({ icon, title, description }: CommitmentItemProps) {
  return (
    <div className="flex gap-4 items-start p-4 bg-stone-50 dark:bg-slate-700/50 rounded-lg">
      <div className="flex-shrink-0 w-10 h-10 bg-stone-200 dark:bg-slate-600 rounded-full
                      flex items-center justify-center text-stone-600 dark:text-stone-300">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-stone-800 dark:text-stone-100">{title}</h3>
        <p className="text-stone-600 dark:text-stone-400 text-sm">{description}</p>
      </div>
    </div>
  );
}

interface TimelineBlockProps {
  label: string;
  weeks: string;
  color: string;
  wide?: boolean;
}

function TimelineBlock({ label, weeks, color, wide }: TimelineBlockProps) {
  return (
    <div className={`${wide ? 'flex-[3]' : 'flex-1'}`}>
      <div className={`${color} h-3 rounded-full mb-2`} />
      <div className="text-xs text-stone-600 dark:text-stone-400">
        <div className="font-medium">{label}</div>
        <div>Wk {weeks}</div>
      </div>
    </div>
  );
}

export default CommitmentScreen;
