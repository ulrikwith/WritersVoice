// Phase Explanation - Final onboarding screen explaining what to expect
import { useState } from 'react';
import { ChevronLeft, Rocket, BookOpen, Feather, Lock, Unlock } from 'lucide-react';

interface PhaseExplanationProps {
  onComplete: () => void;
  onBack: () => void;
}

export function PhaseExplanation({ onComplete, onBack }: PhaseExplanationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleComplete = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 dark:from-slate-900 dark:to-slate-800
                  flex flex-col items-center px-6 py-12
                  transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-6xl mb-4 block">📚</span>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100 mb-4">
          How It Works
        </h1>
        <p className="text-lg text-stone-600 dark:text-stone-300 max-w-xl">
          Features unlock as you develop capacity. Here's what to expect.
        </p>
      </div>

      {/* Phase Cards */}
      <div className="max-w-4xl w-full space-y-4 mb-12">
        <PhaseCard
          phase={1}
          title="Week 1: The Foundation"
          subtitle="Stone Phase"
          icon={<span className="text-2xl">🪨</span>}
          description="Two 5-minute stone practice sessions daily. No writing yet—just learning the pattern."
          features={[
            { label: 'Stone practice timer', unlocked: true },
            { label: '3-sentence daily reflection', unlocked: true },
            { label: 'Text editor', unlocked: false },
            { label: 'Chapters', unlocked: false },
          ]}
          color="bg-amber-500"
        />

        <PhaseCard
          phase={2}
          title="Weeks 2-3: Stone Meets Pen"
          subtitle="Transfer Phase"
          icon={<Feather className="w-6 h-6 text-blue-600" />}
          description="15-20 minute writing sessions with engagement prompts every 5 minutes."
          features={[
            { label: 'Simple text editor', unlocked: true },
            { label: 'Engagement prompts', unlocked: true },
            { label: 'Resonance tracking', unlocked: true },
            { label: 'Multiple chapters', unlocked: false },
          ]}
          color="bg-blue-500"
        />

        <PhaseCard
          phase={3}
          title="Weeks 4-12: Finding Your Voice"
          subtitle="Application Phase"
          icon={<BookOpen className="w-6 h-6 text-purple-600" />}
          description="Progressive unlocks as you develop. Full BookArchitect features by week 10."
          features={[
            { label: 'Multiple chapters (5 → unlimited)', unlocked: true },
            { label: 'Chapter management', unlocked: true },
            { label: 'Reflection workspace (Week 7)', unlocked: true },
            { label: 'Export & community (Week 10)', unlocked: true },
          ]}
          color="bg-purple-500"
        />

        <PhaseCard
          phase={4}
          title="Week 13+: Autonomous Writing"
          subtitle="Full Access"
          icon={<Rocket className="w-6 h-6 text-green-600" />}
          description="Your voice journey is complete. All features unlocked, prompts optional."
          features={[
            { label: 'Complete BookArchitect', unlocked: true },
            { label: 'Optional micro-engagement', unlocked: true },
            { label: 'Voice analytics', unlocked: true },
            { label: 'Community features', unlocked: true },
          ]}
          color="bg-green-500"
        />
      </div>

      {/* Why This Works */}
      <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg
                      border border-stone-200 dark:border-slate-700 mb-8">
        <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-3">
          Why Progressive Unlocking?
        </h3>
        <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed">
          Most writing apps give you everything at once—and most writers never develop their authentic voice.
          By gating features behind actual practice, we ensure you build the foundation before adding complexity.
          The structure isn't a limitation—it's the pedagogy itself.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 max-w-2xl w-full px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 text-stone-600 dark:text-stone-300
                     hover:text-stone-800 dark:hover:text-stone-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <button
          onClick={handleComplete}
          className="flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-full text-lg font-semibold
                     bg-gradient-to-r from-amber-500 via-purple-500 to-green-500
                     text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <Rocket className="w-5 h-5" />
          Start Week 1
        </button>
      </div>
    </div>
  );
}

interface FeatureItem {
  label: string;
  unlocked: boolean;
}

interface PhaseCardProps {
  phase: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  description: string;
  features: FeatureItem[];
  color: string;
}

function PhaseCard({
  phase,
  title,
  subtitle,
  icon,
  description,
  features,
  color,
}: PhaseCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md
                    border border-stone-200 dark:border-slate-700
                    flex flex-col md:flex-row gap-6">
      {/* Left: Phase indicator */}
      <div className="flex-shrink-0 flex md:flex-col items-center gap-3">
        <div className={`${color} w-12 h-12 rounded-full flex items-center justify-center text-white`}>
          {icon}
        </div>
        <div className="md:text-center">
          <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            Phase {phase}
          </div>
        </div>
      </div>

      {/* Right: Content */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
          {title}
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-2">{subtitle}</p>
        <p className="text-stone-600 dark:text-stone-300 text-sm mb-4">{description}</p>

        {/* Feature list */}
        <div className="flex flex-wrap gap-2">
          {features.map((feature, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                         ${feature.unlocked
                           ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                           : 'bg-stone-100 dark:bg-slate-700 text-stone-500 dark:text-stone-400'
                         }`}
            >
              {feature.unlocked ? (
                <Unlock className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              {feature.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PhaseExplanation;
