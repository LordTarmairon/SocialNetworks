import type { ReactionType } from './social';

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] =
  [
    { type: 'like', emoji: '👍', label: 'Me gusta' },
    { type: 'love', emoji: '❤️', label: 'Me encanta' },
    { type: 'haha', emoji: '😂', label: 'Me divierte' },
    { type: 'wow', emoji: '😮', label: 'Me asombra' },
    { type: 'sad', emoji: '😢', label: 'Me entristece' },
    { type: 'angry', emoji: '😡', label: 'Me enfada' },
  ];

export const REACTION_EMOJI: Record<string, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.type, r.emoji]),
);

export const REACTION_LABEL: Record<string, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.type, r.label]),
);
