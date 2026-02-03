// Voice Journey Welcome Screen - First onboarding step
import { useState } from 'react';
import { BookOpen, Feather, Clock, ChevronRight } from 'lucide-react';

interface WelcomeScreenProps {
  onNext: () => void;
  isExistingUser?: boolean;
}

export function WelcomeScreen({ onNext, isExistingUser = false }: WelcomeScreenProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onNext();
    }, 300);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 dark:from-slate-900 dark:to-slate-800
                  flex flex-col items-center justify-center px-6 py-12
                  transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Stone Icon */}
      <div className="mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-stone-400 to-stone-600 rounded-full
                        shadow-lg flex items-center justify-center
                        animate-pulse">
          <span className="text-4xl">🪨</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-stone-800 dark:text-stone-100 text-center mb-4">
        {isExistingUser ? 'BookArchitect Has Evolved' : 'Welcome to BookArchitect'}
      </h1>

      {/* Subtitle */}
      <p className="text-xl text-stone-600 dark:text-stone-300 text-center max-w-2xl mb-12">
        {isExistingUser
          ? 'Discover the 12-week voice development journey that will transform your writing'
          : 'A 12-week journey to develop your authentic writing voice'}
      </p>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mb-12">
        <FeatureCard
          icon={<span className="text-3xl">🪨</span>}
          title="The Stone Practice"
          description="Week 1: Learn the pattern that creates authentic voice through physical practice"
        />
        <FeatureCard
          icon={<Feather className="w-8 h-8 text-blue-600" />}
          title="Progressive Writing"
          description="Weeks 2-12: Transfer that awareness to writing as features unlock"
        />
        <FeatureCard
          icon={<BookOpen className="w-8 h-8 text-purple-600" />}
          title="Full Autonomy"
          description="Week 13+: Write with developed capacity and all features unlocked"
        />
      </div>

      {/* Time Commitment */}
      <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 mb-8">
        <Clock className="w-5 h-5" />
        <span>10-20 minutes daily commitment</span>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleNext}
        className="flex items-center gap-2 px-8 py-4 bg-stone-800 dark:bg-stone-100
                   text-white dark:text-stone-900 rounded-full text-lg font-semibold
                   hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors
                   shadow-lg hover:shadow-xl"
      >
        Begin Your Journey
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Skip option for existing users */}
      {isExistingUser && (
        <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">
          You can also skip this journey and keep using BookArchitect as before
        </p>
      )}
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-stone-200 dark:border-slate-700">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-2">
        {title}
      </h3>
      <p className="text-stone-600 dark:text-stone-400 text-sm">{description}</p>
    </div>
  );
}

export default WelcomeScreen;
