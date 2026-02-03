// Autonomous Phase - Week 13+ Interface
// Full BookArchitect access with optional voice journey features
// This is essentially the current BookArch with optional enhancements

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useProgressStore } from '../store/useProgressStore';
import { usePromptsStore } from '../store/usePromptsStore';
import { StoneCompanion } from '../components/VoiceJourney/writing';
import { Award, Settings, Eye, EyeOff, TrendingUp, Calendar } from 'lucide-react';

interface AutonomousPhaseProps {
  children?: React.ReactNode;
}

export function AutonomousPhase({ children }: AutonomousPhaseProps) {
  const [showJourneyStats, setShowJourneyStats] = useState(false);

  const {
    getCurrentWeek,
    getAverageResonanceAllTime,
    writingSessionsLog,
    resonanceScores,
    stoneSessionsLog,
  } = useProgressStore();

  const { promptsEnabled, setPromptsEnabled } = usePromptsStore();

  const currentWeek = getCurrentWeek();
  const totalSessions = writingSessionsLog.length;
  const avgResonance = getAverageResonanceAllTime();
  const totalStoneSessions = stoneSessionsLog.filter((s) => s.completed).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Minimal Voice Journey Indicator */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <StoneCompanion size="small" showTooltip={false} />
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="font-medium">Voice Journey Complete</span>
            </div>
            <span className="opacity-75">Week {currentWeek}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle journey stats */}
            <button
              onClick={() => setShowJourneyStats(!showJourneyStats)}
              className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              {showJourneyStats ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
              <span>Journey Stats</span>
            </button>

            {/* Toggle micro-engagement prompts */}
            <button
              onClick={() => setPromptsEnabled(!promptsEnabled)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors
                         ${
                           promptsEnabled
                             ? 'bg-white/30'
                             : 'bg-white/10 opacity-60'
                         }`}
            >
              <Settings className="w-3 h-3" />
              <span>Prompts {promptsEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Journey Stats Panel */}
      {showJourneyStats && (
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4">
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Calendar className="w-5 h-5 text-blue-500" />}
                label="Weeks Completed"
                value={Math.min(12, currentWeek - 1).toString()}
                subtext="of 12-week journey"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
                label="Avg Resonance"
                value={avgResonance.toFixed(1)}
                subtext="across all sessions"
              />
              <StatCard
                icon={<span className="text-xl">✍️</span>}
                label="Writing Sessions"
                value={totalSessions.toString()}
                subtext="total completed"
              />
              <StatCard
                icon={<span className="text-xl">🪨</span>}
                label="Stone Sessions"
                value={totalStoneSessions.toString()}
                subtext="grounding practices"
              />
            </div>

            {/* Resonance Trend */}
            {resonanceScores.length > 5 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Resonance Over Time
                </h4>
                <ResonanceMiniChart scores={resonanceScores} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Full BookArch */}
      <main>{children || <Outlet />}</main>
    </div>
  );
}

// Stat card component
function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {value}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-xs text-slate-400 dark:text-slate-500">{subtext}</div>
      </div>
    </div>
  );
}

// Mini resonance chart
function ResonanceMiniChart({
  scores,
}: {
  scores: Array<{ score: number; date: string }>;
}) {
  // Take last 20 scores
  const recentScores = scores.slice(-20);
  const maxScore = 10;
  const chartHeight = 40;

  return (
    <div className="flex items-end gap-1 h-10">
      {recentScores.map((s, i) => {
        const height = (s.score / maxScore) * chartHeight;
        const color =
          s.score >= 7
            ? 'bg-green-400'
            : s.score >= 5
            ? 'bg-blue-400'
            : 'bg-orange-400';

        return (
          <div
            key={i}
            className={`flex-1 ${color} rounded-t transition-all duration-300`}
            style={{ height: `${height}px`, minWidth: '4px', maxWidth: '16px' }}
            title={`${s.score}/10 - ${s.date}`}
          />
        );
      })}
    </div>
  );
}

export default AutonomousPhase;
