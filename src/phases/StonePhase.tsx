// Stone Phase - Week 1 Interface
// Focus: Learning the fundamental pattern through physical stone practice
// Writing Allowed: NO - only 3-sentence daily reflections

import { useState, useEffect, useMemo } from 'react';
import { Lock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { StoneTimer, SimpleJournal, WeekProgress } from '../components/VoiceJourney/stone';
import { useProgressStore } from '../store/useProgressStore';

export function StonePhase() {
  const {
    getCurrentDay,
    getStoneSessionsToday,
    completeStoneSession,
    stoneSessionsLog,
    dailyStoneGoal,
  } = useProgressStore();

  const [showEducation, setShowEducation] = useState(false);
  const [todayReflection, setTodayReflection] = useState('');

  const currentDay = getCurrentDay();
  const sessionsToday = getStoneSessionsToday();
  const daysRemaining = 7 - currentDay;

  // Calculate which days have been completed (had all sessions done)
  // Counts unique dates where user completed the daily goal
  const completedDays = useMemo(() => {
    const dayCompletions: Record<string, number> = {};
    stoneSessionsLog.forEach((session) => {
      if (session.completed) {
        dayCompletions[session.date] = (dayCompletions[session.date] || 0) + 1;
      }
    });

    // Count how many unique days have met the daily goal
    const completedDates = Object.entries(dayCompletions)
      .filter(([, count]) => count >= dailyStoneGoal)
      .map(([date]) => date)
      .sort();

    // Return array of day numbers (1-7) based on count of completed days
    // This represents progress through the week, not specific calendar days
    const completed: number[] = [];
    for (let i = 0; i < Math.min(completedDates.length, 7); i++) {
      completed.push(i + 1);
    }

    // If today is completed but not yet in the list, add it
    if (sessionsToday >= dailyStoneGoal && completed.length < currentDay) {
      while (completed.length < currentDay) {
        completed.push(completed.length + 1);
      }
    }

    return completed;
  }, [stoneSessionsLog, dailyStoneGoal, sessionsToday, currentDay]);

  // Load today's reflection from stone sessions
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySession = stoneSessionsLog.find(
      (s) => s.date === today && s.reflection
    );
    if (todaySession?.reflection) {
      setTodayReflection(todaySession.reflection);
    }
  }, [stoneSessionsLog]);

  const handleSessionComplete = (duration: number) => {
    completeStoneSession(duration, todayReflection || undefined);
  };

  const handleReflectionSave = (content: string) => {
    setTodayReflection(content);
    // The reflection will be attached to the next session completed
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
                         border-b border-stone-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🪨</span>
              <div>
                <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100">
                  Week 1: The Foundation
                </h1>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Day {currentDay} of 7
                </p>
              </div>
            </div>

            {/* Unlock countdown */}
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-100 dark:bg-slate-800 rounded-full">
              <Lock className="w-4 h-4 text-stone-500 dark:text-stone-400" />
              <span className="text-sm text-stone-600 dark:text-stone-300">
                Writing unlocks in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center py-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-stone-400 to-stone-600
                            rounded-full flex items-center justify-center shadow-lg">
              <span className="text-4xl">🪨</span>
            </div>
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
              Today's Practice
            </h2>
            <p className="text-stone-600 dark:text-stone-400">
              Complete {dailyStoneGoal} stone sessions to unlock tomorrow
            </p>
          </div>

          {/* Progress Tracker */}
          <WeekProgress
            currentDay={currentDay}
            completedDays={completedDays}
            sessionsToday={sessionsToday}
            dailyGoal={dailyStoneGoal}
          />

          {/* Stone Timer Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg
                          border border-stone-200 dark:border-slate-700">
            {sessionsToday >= dailyStoneGoal ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/30
                                rounded-full flex items-center justify-center">
                  <span className="text-3xl">✨</span>
                </div>
                <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">
                  Today's Goal Complete
                </h3>
                <p className="text-stone-600 dark:text-stone-400 mb-4">
                  You've completed all {dailyStoneGoal} sessions for today.
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Feel free to practice more, or rest and return tomorrow.
                </p>
              </div>
            ) : (
              <StoneTimer
                duration={300} // 5 minutes
                onComplete={handleSessionComplete}
              />
            )}
          </div>

          {/* Simple Journal */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg
                          border border-stone-200 dark:border-slate-700">
            <SimpleJournal
              maxSentences={3}
              placeholder="What did you notice during your practice?"
              initialValue={todayReflection}
              onSave={handleReflectionSave}
            />
          </div>

          {/* Educational Content - Collapsible */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden
                          border border-stone-200 dark:border-slate-700">
            <button
              onClick={() => setShowEducation(!showEducation)}
              className="w-full flex items-center justify-between p-4
                         hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  Why Start With a Stone?
                </span>
              </div>
              {showEducation ? (
                <ChevronUp className="w-5 h-5 text-stone-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-stone-400" />
              )}
            </button>

            {showEducation && (
              <div className="px-6 pb-6 text-stone-600 dark:text-stone-400 space-y-4">
                <p>
                  You probably expected a writing app. Instead, we're asking you to spend a week
                  with a stone. Here's why:
                </p>

                <h4 className="font-semibold text-stone-800 dark:text-stone-200">
                  The Pattern Transfers
                </h4>
                <p>
                  The quality you develop sensing the stone—that intimate involvement with direct
                  experience—is the same quality that creates authentic voice in writing.
                </p>

                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Sensing beneath thinking</li>
                  <li>Awareness of awareness</li>
                  <li>Direct knowing before conceptual knowing</li>
                </ul>

                <h4 className="font-semibold text-stone-800 dark:text-stone-200">
                  Your Voice Isn't Missing
                </h4>
                <p>
                  You're not learning to "get" voice. You're learning to recognize voice that's
                  already operating at a felt level. Just like your fingertips already know where
                  things are before you consciously register position.
                </p>

                <h4 className="font-semibold text-stone-800 dark:text-stone-200">
                  Why Not Just Start Writing?
                </h4>
                <p>
                  If we gave you the text editor now, you'd write from your head. You'd perform.
                  You'd imitate voices you've internalized. The stone removes all that.
                </p>

                <div className="bg-stone-100 dark:bg-slate-700 rounded-lg p-4 mt-4">
                  <p className="italic">
                    "Every writer who's completed this journey says the same thing: 'I didn't
                    believe the stone would matter. It was everything.'"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default StonePhase;
