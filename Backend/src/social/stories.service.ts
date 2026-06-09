import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async friendIds(userId: string): Promise<string[]> {
    const fs = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    return fs.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
  }

  async create(meId: string, imageUrl: string) {
    const story = await this.prisma.story.create({
      data: {
        authorId: meId,
        imageUrl,
        expiresAt: new Date(Date.now() + STORY_TTL_MS),
      },
    });
    return { id: story.id, imageUrl: story.imageUrl, createdAt: story.createdAt };
  }

  /** Stories activas (no caducadas) propias y de amigos, agrupadas por autor. */
  async listActive(meId: string) {
    const authorIds = [meId, ...(await this.friendIds(meId))];
    const stories = await this.prisma.story.findMany({
      where: { authorId: { in: authorIds }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: publicUser } },
    });

    // Agrupar por autor, con el usuario actual primero.
    const groups = new Map<
      string,
      { author: (typeof stories)[number]['author']; stories: unknown[] }
    >();
    for (const s of stories) {
      if (!groups.has(s.authorId)) {
        groups.set(s.authorId, { author: s.author, stories: [] });
      }
      groups.get(s.authorId)!.stories.push({
        id: s.id,
        imageUrl: s.imageUrl,
        createdAt: s.createdAt,
      });
    }
    const result = [...groups.values()];
    result.sort((a, b) =>
      a.author.id === meId ? -1 : b.author.id === meId ? 1 : 0,
    );
    return result;
  }
}
