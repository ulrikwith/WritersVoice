// Application Phase - Weeks 4-12 Interface
// Progressive unlock of BookArchitect features
// Wraps existing BookArch functionality with feature gates

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useProgressStore } from '../store/useProgressStore';
import { usePromptsStore } from '../store/usePromptsStore';
import { getMaxChapters, getPromptInterval } from '../utils/phaseUnlock';
import { EngagementPrompt, StoneCompanion } from '../components/VoiceJourney/writing';
import { Lock, Unlock, TrendingUp } from 'lucide-react';

interface ApplicationPhaseProps {
  children?: React.ReactNode;
}

export function ApplicationPhase({ children }: ApplicationPhaseProps) {
  const {
    getCurrentWeek,
    unlocked,
    getAverageResonanceThisWeek,
    getWritingSessionsThisWeek,
  } = useProgressStore();

  const {
    currentPrompt,
    promptsEnabled,
    dismissPrompt,
    scheduleNextPrompt,
    checkAndShowPrompt,
  } = usePromptsStore();

  const currentWeek = getCurrentWeek();
  const maxChapters = getMaxChapters(currentWeek);
  const promptInterval = getPromptInterval(currentWeek);
  const averageResonance = getAverageResonanceThisWeek();
  const sessionsThisWeek = getWritingSessionsThisWeek();

  // Get phase sub-stage info
  const getSubStage = () => {
    if (currentWeek >= 10) {
      return {
        name: 'Structured Creation',
        weeks: 'Weeks 10-12',
        description: 'Full features, community, export',
      };
    }
    if (currentWeek >= 7) {
      return {
        name: 'Reflective Integration',
        weeks: 'Weeks 7-9',
        description: 'Unlimited chapters, reflection workspace',
      };
    }
    return {
      name: 'Raw Voice',
      weeks: 'Weeks 4-6',
      description: 'Multiple chapters, reduced prompts',
    };
  };

  const subStage = getSubStage();

  // Prompt handling
  const handlePromptDismiss = () => {
    dismissPrompt();
    scheduleNextPrompt(currentWeek);
  };

  // Check for prompts periodically (if enabled and interval set)
  useEffect(() => {
    if (!promptsEnabled || !promptInterval) return;

    const interval = setInterval(() => {
      checkAndShowPrompt(currentWeek);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [promptsEnabled, promptInterval, currentWeek, checkAndShowPrompt]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Voice Journey Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <StoneCompanion size="small" showTooltip={false} />
            <span className="font-medium">
              Week {currentWeek}: {subStage.name}
            </span>
            <span className="opacity-75">({subStage.weeks})</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Sessions */}
            <span className="opacity-90">{sessionsThisWeek} sessions this week</span>

            {/* Resonance */}
            {averageResonance > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{averageResonance.toFixed(1)} resonance</span>
              </div>
            )}

            {/* Chapter limit indicator */}
            {maxChapters && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full">
                <Lock className="w-3 h-3" />
                <span>Max {maxChapters} chapters</span>
              </div>
            )}

            {/* Prompt interval */}
            {promptInterval && promptsEnabled && (
              <span className="opacity-75">Prompts: every {promptInterval}min</span>
            )}
          </div>
        </div>
      </div>

      {/* Feature unlock indicators */}
      <FeatureUnlockBar unlocked={unlocked} currentWeek={currentWeek} />

      {/* Main Content - Renders existing BookArch routes/components */}
      <main>{children || <Outlet />}</main>

      {/* Engagement Prompt Overlay */}
      {currentPrompt && promptsEnabled && (
        <EngagementPrompt prompt={currentPrompt} onDismiss={handlePromptDismiss} />
      )}
    </div>
  );
}

// Feature unlock status bar
function FeatureUnlockBar({
  unlocked,
  currentWeek,
}: {
  unlocked: ReturnType<typeof useProgressStore.getState>['unlocked'];
  currentWeek: number;
}) {
  const features = [
    {
      key: 'textEditor',
      label: 'Text Editor',
      unlocked: unlocked.textEditor,
      unlocksAt: 2,
    },
    {
      key: 'multipleChapters',
      label: 'Multiple Chapters',
      unlocked: unlocked.multipleChapters,
      unlocksAt: 4,
    },
    {
      key: 'fullChapterManagement',
      label: 'Chapter Management',
      unlocked: unlocked.fullChapterManagement,
      unlocksAt: 7,
    },
    {
      key: 'reflectionWorkspace',
      label: 'Reflection Space',
      unlocked: unlocked.reflectionWorkspace,
      unlocksAt: 7,
    },
    {
      key: 'exportFeatures',
      label: 'Export',
      unlocked: unlocked.exportFeatures,
      unlocksAt: 10,
    },
    {
      key: 'communityFeatures',
      label: 'Community',
      unlocked: unlocked.communityFeatures,
      unlocksAt: 10,
    },
  ];

  // Only show features that are either unlocked or about to unlock
  const relevantFeatures = features.filter(
    (f) => f.unlocked || f.unlocksAt <= currentWeek + 3
  );

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
      <div className="container mx-auto flex items-center gap-4 overflow-x-auto">
        <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
          Features:
        </span>
        {relevantFeatures.map((feature) => (
          <div
            key={feature.key}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs shrink-0
                       ${
                         feature.unlocked
                           ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                           : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                       }`}
          >
            {feature.unlocked ? (
              <Unlock className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            <span>{feature.label}</span>
            {!feature.unlocked && (
              <span className="opacity-60">(Wk {feature.unlocksAt})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApplicationPhase;
