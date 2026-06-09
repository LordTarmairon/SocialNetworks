import type { Presence } from './chat';

/** Texto de presencia estilo WhatsApp: "en línea" o "última vez …". */
export function presenceText(presence: Presence | null): string {
  if (!presence) return '';
  if (presence.online) return 'en línea';
  if (!presence.lastSeenAt) return '';

  const date = new Date(presence.lastSeenAt);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (sameDay) return `última vez hoy a las ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `última vez ayer a las ${time}`;
  }
  return `última vez el ${date.toLocaleDateString()} a las ${time}`;
}
