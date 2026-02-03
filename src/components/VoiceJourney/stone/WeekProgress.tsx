// Week Progress - Visual progress indicator for Week 1
import { Check, Circle } from 'lucide-react';

interface WeekProgressProps {
  currentDay: number; // 1-7
  completedDays: number[]; // Array of completed day numbers
  sessionsToday: number;
  dailyGoal: number;
}

export function WeekProgress({
  currentDay,
  completedDays,
  sessionsToday,
  dailyGoal,
}: WeekProgressProps) {
  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Week title */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
          Week 1 Progress
        </h3>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          Day {currentDay} of 7
        </span>
      </div>

      {/* Day circles */}
      <div className="flex items-center justify-between gap-2">
        {days.map((day) => {
          const isCompleted = completedDays.includes(day);
          const isCurrent = day === currentDay;
          const isFuture = day > currentDay;

          return (
            <div
              key={day}
              className="flex flex-col items-center gap-2"
            >
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center
                           transition-all duration-300
                           ${
                             isCompleted
                               ? 'bg-green-500 text-white'
                               : isCurrent
                               ? 'bg-amber-500 text-white ring-4 ring-amber-200 dark:ring-amber-900'
                               : isFuture
                               ? 'bg-stone-200 dark:bg-slate-700 text-stone-400 dark:text-slate-500'
                               : 'bg-stone-300 dark:bg-slate-600 text-stone-500 dark:text-slate-400'
                           }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <span className="text-sm font-bold">{day}</span>
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>

              {/* Day label */}
              <span
                className={`text-xs ${
                  isCurrent
                    ? 'text-amber-600 dark:text-amber-400 font-medium'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {getDayLabel(day)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Today's progress */}
      <div className="mt-6 p-4 bg-stone-100 dark:bg-slate-800 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Today's Sessions
          </span>
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {sessionsToday} / {dailyGoal}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (sessionsToday / dailyGoal) * 100)}%` }}
          />
        </div>

        {/* Session dots */}
        <div className="flex gap-2 mt-3 justify-center">
          {Array.from({ length: dailyGoal }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center
                         ${
                           i < sessionsToday
                             ? 'bg-green-500 text-white'
                             : 'bg-stone-200 dark:bg-slate-700'
                         }`}
            >
              {i < sessionsToday && <Check className="w-4 h-4" />}
            </div>
          ))}
        </div>

        {/* Status message */}
        <p className="mt-3 text-center text-sm text-stone-600 dark:text-stone-400">
          {getStatusMessage(sessionsToday, dailyGoal)}
        </p>
      </div>

      {/* Connection line */}
      <div className="flex items-center gap-2 mt-4 text-xs text-stone-500 dark:text-stone-400">
        <div className="flex-1 h-px bg-stone-200 dark:bg-slate-700" />
        <span>Writing unlocks after Day 7</span>
        <div className="flex-1 h-px bg-stone-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

function getDayLabel(day: number): string {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return labels[day - 1] || `Day ${day}`;
}

function getStatusMessage(completed: number, goal: number): string {
  if (completed === 0) {
    return 'Start your first session when ready';
  }
  if (completed >= goal) {
    return "Today's goal complete! Well done.";
  }
  const remaining = goal - completed;
  return `${remaining} more session${remaining > 1 ? 's' : ''} to complete today`;
}

export default WeekProgress;
