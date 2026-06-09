import { getToken } from './api';

const ORIGIN = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${ORIGIN}${path}`;
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${ORIGIN}/api/uploads/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data.url as string;
}
