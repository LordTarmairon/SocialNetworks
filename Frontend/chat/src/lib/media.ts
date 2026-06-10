import { getToken } from './api';

// Origen del servidor (sin el sufijo /api), donde se sirven los archivos.
const ORIGIN = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

/** Resuelve una ruta '/uploads/...' a una URL absoluta servible. */
export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${ORIGIN}${path}`;
}

/** Sube una imagen/GIF y devuelve su ruta ('/uploads/...'). */
export async function uploadImage(file: File): Promise<string> {
  return upload('image', file);
}

/** Sube un audio (mensaje de voz) y devuelve su ruta. */
export async function uploadAudio(blob: Blob): Promise<string> {
  return upload('audio', new File([blob], 'voz.webm', { type: blob.type }));
}

async function upload(kind: 'image' | 'audio', file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${ORIGIN}/api/uploads/${kind}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data.url as string;
}
