import { api } from './api';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export type Visibility = 'public' | 'friends' | 'private';

export interface SharedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: PublicUser;
}

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  visibility: Visibility;
  createdAt: string;
  author: PublicUser;
  reactionCount: number;
  reactions: Record<string, number>;
  topReactions: string[];
  myReaction: ReactionType | null;
  commentCount: number;
  savedByMe: boolean;
  sharedPost: SharedPost | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: PublicUser;
  parentId: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies: Comment[];
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
  coverUrl: string | null;
  bio: string | null;
  createdAt: string;
  postCount: number;
  friendCount: number;
  relation: Relation;
  iBlocked: boolean;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface StoryItem {
  id: string;
  imageUrl: string;
  createdAt: string;
  mine?: boolean;
  viewCount?: number;
  viewedByMe?: boolean;
  reactionCount?: number;
  myReaction?: string | null;
}

export interface StoryViewer extends PublicUser {
  emoji: string | null;
}

export interface StoryGroup {
  author: PublicUser;
  stories: StoryItem[];
}

export const socialApi = {
  feed: () => api.get<Post[]>('/feed'),
  reels: () => api.get<Post[]>('/reels'),
  saved: () => api.get<Post[]>('/me/saved'),
  searchPosts: (q: string) =>
    api.get<Post[]>(`/search/posts?q=${encodeURIComponent(q)}`),
  discoverPhotos: () =>
    api.get<{ id: string; imageUrl: string; author: PublicUser }[]>(
      '/discover/photos',
    ),
  createPost: (
    content: string,
    imageUrl?: string,
    visibility?: Visibility,
    sharedPostId?: string,
  ) => api.post<Post>('/posts', { content, imageUrl, visibility, sharedPostId }),
  createReel: (videoUrl: string, content: string) =>
    api.post<Post>('/posts', { videoUrl, content, visibility: 'public' }),
  deletePost: (id: string) => api.del<{ ok: true }>(`/posts/${id}`),
  react: (id: string, type: ReactionType) =>
    api.post<{ ok: true }>(`/posts/${id}/react`, { type }),
  unreact: (id: string) => api.del<{ ok: true }>(`/posts/${id}/react`),
  save: (id: string) => api.post<{ ok: true }>(`/posts/${id}/save`),
  unsave: (id: string) => api.del<{ ok: true }>(`/posts/${id}/save`),
  comments: (id: string) => api.get<Comment[]>(`/posts/${id}/comments`),
  addComment: (id: string, content: string, parentId?: string) =>
    api.post<Comment>(`/posts/${id}/comments`, { content, parentId }),
  likeComment: (id: string) =>
    api.post<{ ok: true }>(`/comments/${id}/like`),
  unlikeComment: (id: string) =>
    api.del<{ ok: true }>(`/comments/${id}/like`),

  profile: (username: string) => api.get<Profile>(`/profiles/${username}`),
  wall: (username: string) => api.get<Post[]>(`/profiles/${username}/posts`),

  stories: () => api.get<StoryGroup[]>('/stories'),
  createStory: (imageUrl: string) =>
    api.post<StoryItem>('/stories', { imageUrl }),
  viewStory: (id: string) => api.post<{ ok: true }>(`/stories/${id}/view`),
  reactStory: (id: string, emoji: string) =>
    api.post<{ ok: true }>(`/stories/${id}/react`, { emoji }),
  unreactStory: (id: string) => api.del<{ ok: true }>(`/stories/${id}/react`),
  storyViewers: (id: string) =>
    api.get<StoryViewer[]>(`/stories/${id}/viewers`),
  commentStory: (id: string, content: string) =>
    api.post<{ id: string }>(`/stories/${id}/comment`, { content }),
  storyComments: (id: string) =>
    api.get<{ id: string; content: string; user: PublicUser }[]>(
      `/stories/${id}/comments`,
    ),
};
