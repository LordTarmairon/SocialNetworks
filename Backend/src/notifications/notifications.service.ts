import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const actorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

export type NotificationType =
  | 'like'
  | 'comment'
  | 'friend_request'
  | 'friend_accept';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea una notificación (ignora si el actor es el propio destinatario). */
  async create(
    userId: string,
    actorId: string,
    type: NotificationType,
    postId?: string,
  ) {
    if (userId === actorId) return;
    await this.prisma.notification.create({
      data: { userId, actorId, type, postId: postId ?? null },
    });
  }

  async list(userId: string, limit = 15) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: actorSelect } },
    });
    return items.map((n) => ({
      id: n.id,
      type: n.type,
      actor: n.actor,
      postId: n.postId,
      read: n.read,
      createdAt: n.createdAt,
    }));
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
