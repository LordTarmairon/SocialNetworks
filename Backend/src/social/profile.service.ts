import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

export type Relation =
  | 'self'
  | 'friends'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'none';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getProfile(meId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Registrar la visita (una fila por visitante, actualiza la fecha).
    if (meId !== user.id) {
      const existing = await this.prisma.profileView.findUnique({
        where: { viewerId_profileId: { viewerId: meId, profileId: user.id } },
        select: { id: true },
      });
      await this.prisma.profileView.upsert({
        where: { viewerId_profileId: { viewerId: meId, profileId: user.id } },
        create: { viewerId: meId, profileId: user.id },
        update: { updatedAt: new Date() },
      });
      // La primera vez que alguien te visita, te avisamos.
      if (!existing) {
        await this.notifications.create(user.id, meId, 'profile_view');
      }
    }

    const [postCount, friendCount, friendship] = await Promise.all([
      this.prisma.post.count({ where: { authorId: user.id } }),
      this.prisma.friendship.count({
        where: {
          status: 'ACCEPTED',
          OR: [{ requesterId: user.id }, { addresseeId: user.id }],
        },
      }),
      meId === user.id
        ? Promise.resolve(null)
        : this.prisma.friendship.findFirst({
            where: {
              OR: [
                { requesterId: meId, addresseeId: user.id },
                { requesterId: user.id, addresseeId: meId },
              ],
            },
          }),
    ]);

    let relation: Relation = 'none';
    if (meId === user.id) relation = 'self';
    else if (friendship) {
      if (friendship.status === 'ACCEPTED') relation = 'friends';
      else if (friendship.requesterId === meId) relation = 'pending_outgoing';
      else relation = 'pending_incoming';
    }

    const [iBlocked, followerCount, followingCount, followRel] =
      await Promise.all([
        meId === user.id
          ? Promise.resolve(false)
          : this.prisma.block
              .findUnique({
                where: {
                  blockerId_blockedId: { blockerId: meId, blockedId: user.id },
                },
                select: { id: true },
              })
              .then((b) => !!b),
        this.prisma.follow.count({ where: { followingId: user.id } }),
        this.prisma.follow.count({ where: { followerId: user.id } }),
        meId === user.id
          ? Promise.resolve(null)
          : this.prisma.follow.findUnique({
              where: {
                followerId_followingId: {
                  followerId: meId,
                  followingId: user.id,
                },
              },
              select: { id: true },
            }),
      ]);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      bio: user.bio,
      createdAt: user.createdAt,
      postCount,
      friendCount,
      relation,
      iBlocked,
      followerCount,
      followingCount,
      isFollowing: !!followRel,
    };
  }
}
