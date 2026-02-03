// Engagement Prompts for Voice Journey
import type { EngagementPrompt } from '../types/voice-journey';

/**
 * Complete prompt library organized by phase
 */
export const PROMPT_LIBRARY: EngagementPrompt[] = [
  // ===== Week 2-3 Prompts (Transfer Phase) =====
  {
    id: 'fingers-keys',
    message: 'Feel your fingers on the keys, sensing the sensing',
    type: 'sensation',
    phase: 2,
    intervalMinutes: 5,
  },
  {
    id: 'landing',
    message: 'Read that last sentence internally - where does it land in your body?',
    type: 'resonance',
    phase: 2,
    intervalMinutes: 5,
  },
  {
    id: 'stone-reminder',
    message: "Same quality you felt with the stone - can you feel it in your writing?",
    type: 'anchor',
    phase: 2,
    intervalMinutes: 7,
  },
  {
    id: 'pause-breath',
    message: 'Pause. Take one breath. Feel yourself breathing.',
    type: 'sensation',
    phase: 2,
    intervalMinutes: 5,
  },
  {
    id: 'move-something',
    message: 'What you just wrote - did it move something in you? Just notice.',
    type: 'resonance',
    phase: 2,
    intervalMinutes: 5,
  },
  {
    id: 'fingertips-lead',
    message: 'Your fingertips already know where the keys are. Let them lead.',
    type: 'sensation',
    phase: 2,
    intervalMinutes: 6,
  },
  {
    id: 'space-between',
    message: 'Notice the space between thinking what to write and writing it.',
    type: 'awareness',
    phase: 2,
    intervalMinutes: 5,
  },
  {
    id: 'shoulders-soften',
    message: 'Is there tension in your shoulders? Let it soften while you write.',
    type: 'sensation',
    phase: 2,
    intervalMinutes: 7,
  },

  // ===== Week 4-6 Prompts (Early Application) =====
  {
    id: 'voice-recognition',
    message: "Is this your voice? Or someone else's you're imitating?",
    type: 'awareness',
    phase: 3,
    intervalMinutes: 10,
  },
  {
    id: 'body-reaction',
    message: "Your body knows if this resonates. What's it telling you?",
    type: 'resonance',
    phase: 3,
    intervalMinutes: 10,
  },
  {
    id: 'thinking-vs-feeling',
    message: 'Are you thinking what to write, or feeling what to write?',
    type: 'awareness',
    phase: 3,
    intervalMinutes: 10,
  },
  {
    id: 'sound-like-you',
    message: 'Read the last paragraph - does it sound like you?',
    type: 'awareness',
    phase: 3,
    intervalMinutes: 12,
  },
  {
    id: 'writing-from',
    message: "Notice where you're writing FROM. Head? Chest? Gut?",
    type: 'resonance',
    phase: 3,
    intervalMinutes: 10,
  },
  {
    id: 'ring-true',
    message: "Is this true? Not factually - does it ring true?",
    type: 'resonance',
    phase: 3,
    intervalMinutes: 10,
  },
  {
    id: 'wants-to-be-said',
    message: "What wants to be said next? Don't think - sense it.",
    type: 'awareness',
    phase: 3,
    intervalMinutes: 11,
  },
  {
    id: 'forcing-allowing',
    message: 'Feel the difference between forcing words and allowing words.',
    type: 'awareness',
    phase: 3,
    intervalMinutes: 10,
  },

  // ===== Week 7-9 Prompts (Deeper Integration) =====
  {
    id: 'notice-noticing',
    message: 'Notice yourself noticing as you write.',
    type: 'awareness',
    phase: 4,
    intervalMinutes: 15,
  },
  {
    id: 'ideas-connect',
    message: 'How do these ideas want to connect? Let them show you.',
    type: 'resonance',
    phase: 4,
    intervalMinutes: 15,
  },
  {
    id: 'passages-land',
    message: 'What makes some passages land more than others?',
    type: 'awareness',
    phase: 4,
    intervalMinutes: 15,
  },
  {
    id: 'voice-texture',
    message: 'Your voice has a texture. What does it feel like right now?',
    type: 'resonance',
    phase: 4,
    intervalMinutes: 18,
  },
  {
    id: 'performing-genuine',
    message: "Notice when you're performing versus when you're genuine.",
    type: 'awareness',
    phase: 4,
    intervalMinutes: 15,
  },
  {
    id: 'underneath',
    message: "What's underneath what you're writing about?",
    type: 'resonance',
    phase: 4,
    intervalMinutes: 17,
  },

  // ===== Week 10-12 Prompts (Minimal) =====
  {
    id: 'check-in-feeling',
    message: "Check in: Are you still feeling what you're writing?",
    type: 'resonance',
    phase: 4,
    intervalMinutes: 30,
  },
  {
    id: 'voice-check',
    message: 'Voice check: Is this authentic?',
    type: 'awareness',
    phase: 4,
    intervalMinutes: 30,
  },
  {
    id: 'body-check',
    message: "Body check: What's your body telling you about this passage?",
    type: 'resonance',
    phase: 4,
    intervalMinutes: 30,
  },
];

/**
 * Get prompts appropriate for the current week
 */
export function getPromptsForWeek(week: number): EngagementPrompt[] {
  if (week < 2) return []; // No prompts in stone phase
  if (week <= 3) {
    // Transfer phase: sensation and basic anchor prompts
    return PROMPT_LIBRARY.filter((p) => p.phase === 2);
  }
  if (week <= 6) {
    // Early application: voice recognition prompts
    return PROMPT_LIBRARY.filter((p) => p.phase === 3);
  }
  if (week <= 9) {
    // Deeper integration: advanced awareness prompts
    return PROMPT_LIBRARY.filter((p) => p.phase === 4 && p.intervalMinutes <= 20);
  }
  // Week 10+: Minimal, optional prompts
  return PROMPT_LIBRARY.filter((p) => p.phase === 4 && p.intervalMinutes >= 25);
}

/**
 * Select a random prompt from available options, avoiding recently shown ones
 */
export function selectPrompt(
  week: number,
  recentlyShown: string[]
): EngagementPrompt | null {
  const availablePrompts = getPromptsForWeek(week);
  if (availablePrompts.length === 0) return null;

  // Filter out recently shown prompts
  const freshPrompts = availablePrompts.filter(
    (p) => !recentlyShown.includes(p.id)
  );

  // If all prompts have been shown, reset and use all
  const pool = freshPrompts.length > 0 ? freshPrompts : availablePrompts;

  // Random selection
  return pool[Math.floor(Math.random() * pool.length)];
}
