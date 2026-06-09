import { Injectable } from '@nestjs/common';

/**
 * Presencia en memoria: cuántas conexiones WebSocket activas tiene cada usuario.
 * Un usuario está "en línea" mientras tenga al menos una conexión abierta.
 */
@Injectable()
export class PresenceService {
  private readonly counts = new Map<string, number>();

  /** Registra una conexión. Devuelve true si el usuario pasa a estar en línea. */
  add(userId: string): boolean {
    const next = (this.counts.get(userId) ?? 0) + 1;
    this.counts.set(userId, next);
    return next === 1;
  }

  /** Quita una conexión. Devuelve true si el usuario pasa a estar desconectado. */
  remove(userId: string): boolean {
    const next = (this.counts.get(userId) ?? 1) - 1;
    if (next <= 0) {
      this.counts.delete(userId);
      return true;
    }
    this.counts.set(userId, next);
    return false;
  }

  isOnline(userId: string): boolean {
    return this.counts.has(userId);
  }
}
