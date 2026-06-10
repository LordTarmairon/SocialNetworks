import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
  private readonly logger = new Logger(StoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Borra las stories caducadas cada hora. */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired() {
    const { count } = await this.prisma.story.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) {
      this.logger.log(`Limpieza de stories: ${count} caducadas eliminadas`);
    }
  }

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
      include: {
        author: { select: publicUser },
        views: { select: { viewerId: true } },
        reactions: { select: { userId: true, emoji: true } },
      },
    });

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
        mine: s.authorId === meId,
        viewCount: s.views.length,
        viewedByMe: s.views.some((v) => v.viewerId === meId),
        reactionCount: s.reactions.length,
        myReaction: s.reactions.find((r) => r.userId === meId)?.emoji ?? null,
      });
    }
    const result = [...groups.values()];
    result.sort((a, b) =>
      a.author.id === meId ? -1 : b.author.id === meId ? 1 : 0,
    );
    return result;
  }

  /** Registra que el usuario ha visto una historia (no cuenta al autor). */
  async recordView(meId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (!story || story.authorId === meId) return { ok: true };
    await this.prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId: meId } },
      create: { storyId, viewerId: meId },
      update: {},
    });
    return { ok: true };
  }

  async reactToStory(meId: string, storyId: string, emoji: string) {
    await this.prisma.storyReaction.upsert({
      where: { storyId_userId: { storyId, userId: meId } },
      create: { storyId, userId: meId, emoji },
      update: { emoji },
    });
    return { ok: true };
  }

  async unreactStory(meId: string, storyId: string) {
    await this.prisma.storyReaction.deleteMany({
      where: { storyId, userId: meId },
    });
    return { ok: true };
  }

  /** Lista de quién ha visto una historia (solo el autor) + su reacción. */
  async getViewers(meId: string, storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { authorId: true },
    });
    if (!story) throw new NotFoundException('Historia no encontrada');
    if (story.authorId !== meId) {
      throw new ForbiddenException('Solo el autor ve quién la ha visto');
    }
    const [views, reactions] = await Promise.all([
      this.prisma.storyView.findMany({
        where: { storyId },
        orderBy: { createdAt: 'desc' },
        include: { viewer: { select: publicUser } },
      }),
      this.prisma.storyReaction.findMany({
        where: { storyId },
        select: { userId: true, emoji: true },
      }),
    ]);
    const reactionByUser = new Map(reactions.map((r) => [r.userId, r.emoji]));
    return views.map((v) => ({
      ...v.viewer,
      emoji: reactionByUser.get(v.viewerId) ?? null,
    }));
  }
}
