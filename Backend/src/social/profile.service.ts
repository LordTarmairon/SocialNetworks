import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type Relation =
  | 'self'
  | 'friends'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'none';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(meId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Registrar la visita (una fila por visitante, actualiza la fecha).
    if (meId !== user.id) {
      await this.prisma.profileView.upsert({
        where: { viewerId_profileId: { viewerId: meId, profileId: user.id } },
        create: { viewerId: meId, profileId: user.id },
        update: { updatedAt: new Date() },
      });
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

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
      postCount,
      friendCount,
      relation,
    };
  }
}
