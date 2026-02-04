// Phase unlock utilities for Voice Journey
import type { Phase, UnlockState, WeekInfo } from '../types/voice-journey';

/**
 * Calculate the current week number (1-based)
 */
export function getCurrentWeek(daysSinceStart: number): number {
  return Math.floor(daysSinceStart / 7) + 1;
}

/**
 * Calculate day within current week (1-7)
 */
export function getDayOfWeek(daysSinceStart: number): number {
  return (daysSinceStart % 7) + 1;
}

/**
 * Calculate days since journey started
 */
export function getDaysSinceStart(startDate: string | null): number {
  if (!startDate) return 0;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate current phase based on days since start
 */
export function calculatePhase(daysSinceStart: number): Phase {
  if (daysSinceStart < 7) return 'stone';      // Week 1: Days 0-6
  if (daysSinceStart < 21) return 'transfer';   // Weeks 2-3: Days 7-20
  if (daysSinceStart < 84) return 'application'; // Weeks 4-12: Days 21-83
  return 'autonomous';                           // Week 13+: Day 84+
}

/**
 * Calculate which features should be unlocked based on progress
 *
 * Note: This is the local UI unlock state. Blue.cc uses FEATURE_UNLOCK_SCHEDULE
 * in services/bluecc/types.ts for cloud sync. Keep these schedules aligned:
 *
 * Week 2: textEditor (= basic-writing, micro-prompts, simple-reflection)
 * Week 4: multipleChapters (= text-editing, multiple-chapters)
 * Week 5: (cloud only: reflection-workspace, chapter-reordering)
 * Week 6: (cloud only: community-features, peer-visibility)
 * Week 7: fullChapterManagement, reflectionWorkspace (= advanced-prompts, resonance-tracking)
 * Week 8: (cloud only: export-capabilities, publishing-prep)
 * Week 10: communityFeatures, fullEditor, exportFeatures (= export-features)
 * Week 12: (cloud only: full-autonomous-access)
 */
export function calculateUnlocks(daysSinceStart: number): UnlockState {
  const week = getCurrentWeek(daysSinceStart);

  return {
    textEditor: week >= 2,
    multipleChapters: week >= 4,
    fullChapterManagement: week >= 7,
    reflectionWorkspace: week >= 7,
    communityFeatures: week >= 10,
    fullEditor: week >= 10,
    exportFeatures: week >= 10,
  };
}

/**
 * Get maximum allowed chapters based on current week
 */
export function getMaxChapters(week: number): number | null {
  if (week < 4) return 1;  // Single chapter only (Weeks 1-3)
  if (week < 7) return 5;  // Limited chapters (Weeks 4-6)
  return null;              // Unlimited (Week 7+)
}

/**
 * Get prompt interval in minutes based on current week
 */
export function getPromptInterval(week: number): number | null {
  if (week < 2) return null;  // No prompts in stone phase
  if (week <= 3) return 5;    // Every 5 minutes (Weeks 2-3)
  if (week <= 6) return 10;   // Every 10 minutes (Weeks 4-6)
  if (week <= 9) return 15;   // Every 15 minutes (Weeks 7-9)
  return null;                 // Optional after week 9
}

/**
 * Get comprehensive week info
 */
export function getWeekInfo(startDate: string | null): WeekInfo {
  const daysSinceStart = getDaysSinceStart(startDate);
  return {
    week: getCurrentWeek(daysSinceStart),
    day: getDayOfWeek(daysSinceStart),
    daysSinceStart,
    phase: calculatePhase(daysSinceStart),
  };
}

/**
 * Feature unlock notification data
 */
export interface FeatureUnlock {
  feature: string;
  description: string;
  icon: string;
}

/**
 * Check if new features should be unlocked when transitioning weeks
 */
export function getNewUnlocks(
  previousWeek: number,
  currentWeek: number
): FeatureUnlock[] {
  const unlocks: FeatureUnlock[] = [];

  // Week 2: Text editor
  if (previousWeek === 1 && currentWeek === 2) {
    unlocks.push({
      feature: 'Text Editor',
      description: 'You can now write in the app',
      icon: 'edit',
    });
  }

  // Week 4: Multiple chapters
  if (previousWeek === 3 && currentWeek === 4) {
    unlocks.push({
      feature: 'Multiple Chapters',
      description: 'Create up to 5 chapters',
      icon: 'layers',
    });
  }

  // Week 7: Full features
  if (previousWeek === 6 && currentWeek === 7) {
    unlocks.push(
      {
        feature: 'Unlimited Chapters',
        description: 'No more chapter limits',
        icon: 'infinity',
      },
      {
        feature: 'Reflection Workspace',
        description: 'A dedicated space for processing',
        icon: 'book-open',
      }
    );
  }

  // Week 10: Community & export
  if (previousWeek === 9 && currentWeek === 10) {
    unlocks.push(
      {
        feature: 'Community Sharing',
        description: 'Share with the community',
        icon: 'users',
      },
      {
        feature: 'Export & Publishing',
        description: 'Export your work to various formats',
        icon: 'download',
      }
    );
  }

  // Week 13: Autonomous phase
  if (previousWeek === 12 && currentWeek === 13) {
    unlocks.push({
      feature: 'Full Autonomy',
      description: 'All features unlocked. Your voice journey is complete!',
      icon: 'award',
    });
  }

  return unlocks;
}

/**
 * Get phase display name
 */
export function getPhaseName(phase: Phase): string {
  switch (phase) {
    case 'stone':
      return 'The Foundation';
    case 'transfer':
      return 'Stone Meets Pen';
    case 'application':
      return 'Finding Your Voice';
    case 'autonomous':
      return 'Autonomous Writing';
  }
}

/**
 * Get phase description
 */
export function getPhaseDescription(phase: Phase): string {
  switch (phase) {
    case 'stone':
      return 'Learn the fundamental pattern through physical stone practice. No writing yet—just sensing.';
    case 'transfer':
      return 'Transfer your stone awareness to writing. Simple editor with guided prompts.';
    case 'application':
      return 'Apply your developing voice to longer-form writing as features progressively unlock.';
    case 'autonomous':
      return 'Your voice journey is complete. Write with full autonomy and developed capacity.';
  }
}

/**
 * Calculate progress percentage within current phase
 */
export function getPhaseProgress(daysSinceStart: number): number {
  const phase = calculatePhase(daysSinceStart);

  switch (phase) {
    case 'stone':
      return Math.min(100, (daysSinceStart / 7) * 100);
    case 'transfer':
      return Math.min(100, ((daysSinceStart - 7) / 14) * 100);
    case 'application':
      return Math.min(100, ((daysSinceStart - 21) / 63) * 100);
    case 'autonomous':
      return 100;
  }
}
