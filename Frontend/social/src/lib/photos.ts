import { api } from './api';
import type { PublicUser } from './social';

export interface AlbumSummary {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  photoCount: number;
  coverUrl: string | null;
}

export interface PhotoTag {
  id: string;
  x: number | null;
  y: number | null;
  user: PublicUser;
}

export interface Photo {
  id: string;
  albumId: string | null;
  url: string;
  caption: string | null;
  createdAt: string;
  owner: PublicUser;
  tags: PhotoTag[];
}

export interface Album {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  owner: PublicUser;
  photos: Photo[];
}

export interface PhotoComment {
  id: string;
  content: string;
  createdAt: string;
  author: PublicUser;
}

export const photosApi = {
  listAlbums: (username: string) =>
    api.get<AlbumSummary[]>(`/users/${username}/albums`),
  createAlbum: (title: string, description?: string) =>
    api.post<AlbumSummary>('/albums', { title, description }),
  getAlbum: (id: string) => api.get<Album>(`/albums/${id}`),
  deleteAlbum: (id: string) => api.del<{ ok: true }>(`/albums/${id}`),

  addPhoto: (albumId: string, url: string, caption?: string) =>
    api.post<Photo>(`/albums/${albumId}/photos`, { url, caption }),
  getPhoto: (id: string) => api.get<Photo>(`/photos/${id}`),
  updateCaption: (id: string, caption: string) =>
    api.patch<Photo>(`/photos/${id}`, { caption }),
  deletePhoto: (id: string) => api.del<{ ok: true }>(`/photos/${id}`),

  tag: (photoId: string, userId: string, x?: number, y?: number) =>
    api.post<Photo>(`/photos/${photoId}/tags`, { userId, x, y }),
  removeTag: (photoId: string, tagId: string) =>
    api.del<Photo>(`/photos/${photoId}/tags/${tagId}`),

  comments: (photoId: string) =>
    api.get<PhotoComment[]>(`/photos/${photoId}/comments`),
  addComment: (photoId: string, content: string) =>
    api.post<PhotoComment>(`/photos/${photoId}/comments`, { content }),
};
