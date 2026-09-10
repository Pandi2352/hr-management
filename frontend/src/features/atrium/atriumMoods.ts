/**
 * Mood presets.
 *
 * One tap has to be enough, because a status nobody can set in a second is a
 * status nobody sets. The presets are the whole point: they are workplace
 * moods, written the way a colleague would actually say it, and they give
 * people permission to be honest without composing anything.
 *
 * The text is editable after picking, so a preset is a starting line rather
 * than a fixed vocabulary.
 */
export interface MoodPreset {
  emoji: string;
  text: string;
}

export const MOOD_PRESETS: MoodPreset[] = [
  { emoji: '🎯', text: 'Heads down, deep work' },
  { emoji: '☕', text: 'Running on coffee' },
  { emoji: '🔥', text: 'Shipping today' },
  { emoji: '🧠', text: 'Thinking, back soon' },
  { emoji: '🙌', text: 'Free to help' },
  { emoji: '📚', text: 'Learning something new' },
  { emoji: '🐛', text: 'Fighting a bug' },
  { emoji: '🎧', text: 'In the zone' },
  { emoji: '🏃', text: 'Between meetings' },
  { emoji: '🌱', text: 'Slow start today' },
  { emoji: '🎉', text: 'Something went right' },
  { emoji: '🧊', text: 'Blocked, need a hand' },
  { emoji: '🛠️', text: 'Fixing things' },
  { emoji: '✈️', text: 'Half here, half away' },
  { emoji: '🥱', text: 'Low battery' },
  { emoji: '🚀', text: 'Big week' },
];

/** The emoji offered when someone writes their own line. */
export const MOOD_EMOJI_CHOICES = [
  '🎯', '☕', '🔥', '🧠', '🙌', '📚', '🐛', '🎧',
  '🏃', '🌱', '🎉', '🧊', '🛠️', '✈️', '🥱', '🚀',
  '😀', '😅', '🤝', '💡', '🍕', '🎵', '🌧️', '🏆',
];
