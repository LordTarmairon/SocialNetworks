import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Panel de "Novedades" estilo Tuenti. */
  async getNews(meId: string) {
    const sinceJoins = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [
      profileVisits,
      recentVisitors,
      friendRequests,
      friendCount,
      newUsers,
      notifications,
      unread,
    ] = await Promise.all([
      this.prisma.profileView.count({ where: { profileId: meId } }),
      this.prisma.profileView.findMany({
        where: { profileId: meId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { viewer: { select: publicUser } },
      }),
      this.prisma.friendship.count({
        where: { addresseeId: meId, status: 'PENDING' },
      }),
      this.prisma.friendship.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: meId }, { addresseeId: meId }],
        },
      }),
      this.prisma.user.findMany({
        where: { id: { not: meId }, createdAt: { gte: sinceJoins } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { ...publicUser, createdAt: true },
      }),
      this.notifications.list(meId),
      this.notifications.unreadCount(meId),
    ]);

    return {
      profileVisits,
      recentVisitors: recentVisitors.map((v) => v.viewer),
      friendRequests,
      friendCount,
      milestone: MILESTONES.includes(friendCount) ? friendCount : null,
      newUsers: newUsers.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        joinedAt: u.createdAt,
      })),
      notifications,
      unread,
    };
  }
}
