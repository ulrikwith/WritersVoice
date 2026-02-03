// Voice Module - Voice Journey dashboard view
import { useState } from 'react';
import {
  Calendar,
  TrendingUp,
  Award,
  Check,
  Lock,
  Unlock,
  Settings,
  RotateCcw
} from 'lucide-react';
import { useProgressStore } from '../../store/useProgressStore';
import { StoneTimer } from '../VoiceJourney/stone';
import { DevPanel } from '../VoiceJourney/DevPanel';
import { getPhaseName, getPhaseDescription, getPhaseProgress } from '../../utils/phaseUnlock';
import type { Phase } from '../../types/voice-journey';

export function VoiceModule() {
  const [showSettings, setShowSettings] = useState(false);
  const [showStoneTimer, setShowStoneTimer] = useState(false);

  const {
    phase,
    getCurrentWeek,
    getCurrentDay,
    getDaysSinceStart,
    getStoneSessionsToday,
    getWritingSessionsThisWeek,
    getAverageResonanceThisWeek,
    getAverageResonanceAllTime,
    stoneSessionsLog,
    writingSessionsLog,
    resonanceScores,
    unlocked,
    dailyStoneGoal,
    hasCompletedOnboarding,
    completeStoneSession,
    resetJourney,
    forcePhase,
    devModeEnabled,
    setDevMode,
    startJourney,
  } = useProgressStore();

  const currentWeek = getCurrentWeek();
  const currentDay = getCurrentDay();
  const daysSinceStart = getDaysSinceStart();
  const stoneSessionsToday = getStoneSessionsToday();
  const writingSessionsThisWeek = getWritingSessionsThisWeek();
  const avgResonanceWeek = getAverageResonanceThisWeek();
  const avgResonanceAll = getAverageResonanceAllTime();
  const phaseProgress = getPhaseProgress(daysSinceStart);

  // Get phase-specific styles - using static Tailwind classes to ensure proper CSS generation
  const getPhaseStyles = (p: Phase) => {
    switch (p) {
      case 'stone':
        return {
          card: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800',
          icon: 'bg-amber-500',
          progress: 'bg-amber-500',
        };
      case 'transfer':
        return {
          card: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800',
          icon: 'bg-blue-500',
          progress: 'bg-blue-500',
        };
      case 'application':
        return {
          card: 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800',
          icon: 'bg-purple-500',
          progress: 'bg-purple-500',
        };
      case 'autonomous':
        return {
          card: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800',
          icon: 'bg-green-500',
          progress: 'bg-green-500',
        };
    }
  };

  const phaseStyles = getPhaseStyles(phase);

  if (!hasCompletedOnboarding) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-stone-400 to-stone-600 rounded-full flex items-center justify-center">
            <span className="text-4xl">🪨</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Begin Your Voice Journey
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
            A 12-week journey to develop your authentic writing voice through the Natural Learning Paradigm.
          </p>
          <button
            onClick={() => startJourney()}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl
                       hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl"
          >
            Start Journey
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Voice Journey
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {getPhaseName(phase)} · Week {currentWeek}, Day {currentDay}
          </p>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-4">Developer Tools</h4>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setDevMode(!devModeEnabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                devModeEnabled
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Dev Mode: {devModeEnabled ? 'ON' : 'OFF'}
            </button>

            {devModeEnabled && (
              <>
                {(['stone', 'transfer', 'application', 'autonomous'] as Phase[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => forcePhase(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      phase === p
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={resetJourney}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Phase Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phase Card */}
          <div className={`${phaseStyles.card} rounded-2xl p-6 border`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${phaseStyles.icon} rounded-xl flex items-center justify-center text-white text-2xl`}>
                  {phase === 'stone' && '🪨'}
                  {phase === 'transfer' && '✍️'}
                  {phase === 'application' && '📖'}
                  {phase === 'autonomous' && '🚀'}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {getPhaseName(phase)}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Phase {['stone', 'transfer', 'application', 'autonomous'].indexOf(phase) + 1} of 4
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {Math.round(phaseProgress)}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">complete</div>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              {getPhaseDescription(phase)}
            </p>

            {/* Progress bar */}
            <div className="h-2 bg-white/50 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${phaseStyles.progress} transition-all duration-500`}
                style={{ width: `${phaseProgress}%` }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          {phase === 'stone' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
                Today's Practice
              </h4>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Sessions Today</div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {stoneSessionsToday} / {dailyStoneGoal}
                  </div>
                </div>

                <button
                  onClick={() => setShowStoneTimer(true)}
                  disabled={stoneSessionsToday >= dailyStoneGoal}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    stoneSessionsToday >= dailyStoneGoal
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {stoneSessionsToday >= dailyStoneGoal ? (
                    <>
                      <Check className="w-5 h-5" />
                      Complete
                    </>
                  ) : (
                    <>
                      <span className="text-xl">🪨</span>
                      Start Session
                    </>
                  )}
                </button>
              </div>

              {/* Session dots */}
              <div className="flex gap-2">
                {Array.from({ length: dailyStoneGoal }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      i < stoneSessionsToday
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700'
                    }`}
                  >
                    {i < stoneSessionsToday && <Check className="w-4 h-4" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              label="Days"
              value={daysSinceStart.toString()}
              subtext="in journey"
              colorClass="text-blue-500"
            />
            <StatCard
              icon={<span className="text-lg">🪨</span>}
              label="Stone Sessions"
              value={stoneSessionsLog.filter(s => s.completed).length.toString()}
              subtext="completed"
              colorClass="text-amber-500"
            />
            <StatCard
              icon={<span className="text-lg">✍️</span>}
              label="Writing Sessions"
              value={writingSessionsLog.length.toString()}
              subtext="completed"
              colorClass="text-purple-500"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Avg Resonance"
              value={avgResonanceAll > 0 ? avgResonanceAll.toFixed(1) : '—'}
              subtext="all time"
              colorClass="text-green-500"
            />
          </div>
        </div>

        {/* Right Column - Features & Timeline */}
        <div className="space-y-6">
          {/* Feature Unlocks */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Feature Unlocks
            </h4>

            <div className="space-y-3">
              <FeatureItem
                label="Text Editor"
                unlocked={unlocked.textEditor}
                week={2}
              />
              <FeatureItem
                label="Multiple Chapters"
                unlocked={unlocked.multipleChapters}
                week={4}
              />
              <FeatureItem
                label="Chapter Management"
                unlocked={unlocked.fullChapterManagement}
                week={7}
              />
              <FeatureItem
                label="Reflection Workspace"
                unlocked={unlocked.reflectionWorkspace}
                week={7}
              />
              <FeatureItem
                label="Export Features"
                unlocked={unlocked.exportFeatures}
                week={10}
              />
              <FeatureItem
                label="Community"
                unlocked={unlocked.communityFeatures}
                week={10}
              />
            </div>
          </div>

          {/* Week Stats */}
          {currentWeek >= 2 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">
                This Week
              </h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Writing Sessions</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {writingSessionsThisWeek}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Avg Resonance</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {avgResonanceWeek > 0 ? avgResonanceWeek.toFixed(1) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Scores Recorded</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {resonanceScores.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Journey Milestone */}
          {phase === 'autonomous' && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 rounded-xl p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-green-800 dark:text-green-200">
                  Journey Complete
                </h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                You've completed the 12-week voice development journey.
                All features are now unlocked. Keep writing with your authentic voice!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stone Timer Modal */}
      {showStoneTimer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <StoneTimer
                duration={300}
                onComplete={(duration) => {
                  completeStoneSession(duration);
                  setShowStoneTimer(false);
                }}
                onCancel={() => setShowStoneTimer(false)}
              />
            </div>
          </div>
        </div>
      )}
      <DevPanel />
    </div>
  );
}

// Stat Card Component - using static colorClass prop
function StatCard({
  icon,
  label,
  value,
  subtext,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  colorClass: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className={`${colorClass} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-xs text-slate-400 dark:text-slate-500">{subtext}</div>
    </div>
  );
}

// Feature Item Component
function FeatureItem({
  label,
  unlocked,
  week,
}: {
  label: string;
  unlocked: boolean;
  week: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {unlocked ? (
          <Unlock className="w-4 h-4 text-green-500" />
        ) : (
          <Lock className="w-4 h-4 text-slate-400" />
        )}
        <span className={unlocked ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>
          {label}
        </span>
      </div>
      <span className="text-xs text-slate-400">
        {unlocked ? '✓' : `Wk ${week}`}
      </span>
    </div>
  );
}

export default VoiceModule;
