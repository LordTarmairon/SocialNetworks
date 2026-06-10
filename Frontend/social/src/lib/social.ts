import { api } from './api';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export type Visibility = 'public' | 'friends' | 'private';

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  visibility: Visibility;
  createdAt: string;
  author: PublicUser;
  reactionCount: number;
  reactions: Record<string, number>;
  topReactions: string[];
  myReaction: ReactionType | null;
  commentCount: number;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: PublicUser;
}

export type Relation =
  | 'self'
  | 'friends'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'none';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  postCount: number;
  friendCount: number;
  relation: Relation;
}

export interface StoryItem {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export interface StoryGroup {
  author: PublicUser;
  stories: StoryItem[];
}

export const socialApi = {
  feed: () => api.get<Post[]>('/feed'),
  createPost: (content: string, imageUrl?: string, visibility?: Visibility) =>
    api.post<Post>('/posts', { content, imageUrl, visibility }),
  deletePost: (id: string) => api.del<{ ok: true }>(`/posts/${id}`),
  react: (id: string, type: ReactionType) =>
    api.post<{ ok: true }>(`/posts/${id}/react`, { type }),
  unreact: (id: string) => api.del<{ ok: true }>(`/posts/${id}/react`),
  comments: (id: string) => api.get<Comment[]>(`/posts/${id}/comments`),
  addComment: (id: string, content: string) =>
    api.post<Comment>(`/posts/${id}/comments`, { content }),

  profile: (username: string) => api.get<Profile>(`/profiles/${username}`),
  wall: (username: string) => api.get<Post[]>(`/profiles/${username}/posts`),

  stories: () => api.get<StoryGroup[]>('/stories'),
  createStory: (imageUrl: string) =>
    api.post<StoryItem>('/stories', { imageUrl }),
};
