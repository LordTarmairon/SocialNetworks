import { api } from './api';
import type { PublicUser } from './social';

export type RsvpStatus = 'going' | 'maybe' | 'declined';

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  host: PublicUser;
  isHost: boolean;
  goingCount: number;
  maybeCount: number;
  myStatus: RsvpStatus | null;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  startsAt: string;
}

export const eventsApi = {
  list: () => api.get<EventItem[]>('/events'),
  create: (data: CreateEventInput) => api.post<EventItem>('/events', data),
  rsvp: (id: string, status: RsvpStatus) =>
    api.post<{ ok: true }>(`/events/${id}/rsvp`, { status }),
  remove: (id: string) => api.del<{ ok: true }>(`/events/${id}`),
};
