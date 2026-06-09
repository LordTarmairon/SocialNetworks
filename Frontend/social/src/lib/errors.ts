import type { ApiError } from './api';

export function errorMessage(err: unknown): string {
  const apiErr = err as ApiError;
  if (apiErr && apiErr.message) {
    return Array.isArray(apiErr.message)
      ? apiErr.message.join('. ')
      : apiErr.message;
  }
  return 'Algo salió mal. Inténtalo de nuevo.';
}
