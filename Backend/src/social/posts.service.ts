import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

export const REACTION_TYPES = [
  'like',
  'love',
  'haha',
  'wow',
  'sad',
  'angry',
] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

type Author = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type RawShared = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: Author;
} | null;

type RawPost = {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  visibility: string;
  createdAt: Date;
  author: Author;
  _count: { comments: number };
  likes: { userId: string; type: string }[];
  saves: { id: string }[];
  sharedPost: RawShared;
};

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** ¿Son amigos (o el mismo usuario)? */
  private async areFriends(meId: string, otherId: string): Promise<boolean> {
    if (meId === otherId) return true;
    const f = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: meId, addresseeId: otherId },
          { requesterId: otherId, addresseeId: meId },
        ],
      },
      select: { id: true },
    });
    return !!f;
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

  private format(p: RawPost, meId: string) {
    // Recuento por tipo de reacción.
    const breakdown: Record<string, number> = {};
    for (const r of p.likes) {
      breakdown[r.type] = (breakdown[r.type] ?? 0) + 1;
    }
    // Tipos presentes ordenados por frecuencia (para mostrar los iconos top).
    const topReactions = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);

    return {
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      visibility: p.visibility,
      createdAt: p.createdAt,
      author: p.author,
      reactionCount: p.likes.length,
      reactions: breakdown,
      topReactions,
      myReaction: p.likes.find((r) => r.userId === meId)?.type ?? null,
      commentCount: p._count.comments,
      savedByMe: p.saves.length > 0,
      sharedPost: p.sharedPost
        ? {
            id: p.sharedPost.id,
            content: p.sharedPost.content,
            imageUrl: p.sharedPost.imageUrl,
            createdAt: p.sharedPost.createdAt,
            author: p.sharedPost.author,
          }
        : null,
    };
  }

  private postInclude(meId: string) {
    return {
      author: { select: publicUser },
      _count: { select: { comments: true } },
      likes: { select: { userId: true, type: true } },
      saves: { where: { userId: meId }, select: { id: true } },
      sharedPost: {
        select: {
          id: true,
          content: true,
          imageUrl: true,
          createdAt: true,
          author: { select: publicUser },
        },
      },
    };
  }

  async createPost(
    meId: string,
    data: {
      content?: string;
      imageUrl?: string;
      visibility?: string;
      sharedPostId?: string;
    },
  ) {
    const content = (data.content ?? '').trim();
    if (!content && !data.imageUrl && !data.sharedPostId) {
      throw new BadRequestException('La publicación está vacía');
    }
    const visibility = ['public', 'friends', 'private'].includes(
      data.visibility ?? '',
    )
      ? data.visibility!
      : 'friends';

    // Si comparte, validamos que la publicación original existe; y si la
    // original ya era una compartición, apuntamos a la raíz.
    let sharedPostId = data.sharedPostId ?? null;
    if (sharedPostId) {
      const original = await this.prisma.post.findUnique({
        where: { id: sharedPostId },
        select: { id: true, sharedPostId: true, authorId: true },
      });
      if (!original) throw new NotFoundException('Publicación no encontrada');
      sharedPostId = original.sharedPostId ?? original.id;
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: meId,
        content,
        imageUrl: data.imageUrl ?? null,
        visibility,
        sharedPostId,
      },
      include: this.postInclude(meId),
    });
    await this.notifyMentions(content, meId, post.id);
    return this.format(post as RawPost, meId);
  }

  // ---- Guardar publicaciones --------------------------------------------

  async savePost(meId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    await this.prisma.savedPost.upsert({
      where: { postId_userId: { postId, userId: meId } },
      create: { postId, userId: meId },
      update: {},
    });
    return { ok: true };
  }

  async unsavePost(meId: string, postId: string) {
    await this.prisma.savedPost.deleteMany({ where: { postId, userId: meId } });
    return { ok: true };
  }

  async listSaved(meId: string) {
    const saved = await this.prisma.savedPost.findMany({
      where: { userId: meId },
      orderBy: { createdAt: 'desc' },
      include: { post: { include: this.postInclude(meId) } },
    });
    return saved.map((s) => this.format(s.post as RawPost, meId));
  }

  /** Detecta @usuario en el texto y notifica a los etiquetados. */
  private async notifyMentions(
    content: string,
    authorId: string,
    postId: string,
  ) {
    const usernames = [
      ...new Set(
        (content.match(/@([a-zA-Z0-9_]+)/g) ?? []).map((m) => m.slice(1)),
      ),
    ];
    if (usernames.length === 0) return;
    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true },
    });
    for (const u of users) {
      await this.notifications.create(u.id, authorId, 'mention', postId);
    }
  }

  /** Feed: publicaciones propias y de los amigos (sin los 'solo yo' ajenos). */
  async feed(meId: string) {
    const authorIds = [meId, ...(await this.friendIds(meId))];
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: authorIds },
        OR: [{ authorId: meId }, { visibility: { not: 'private' } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.postInclude(meId),
    });
    return posts.map((p) => this.format(p as RawPost, meId));
  }

  /** Busca publicaciones por texto/hashtag entre las visibles para el usuario. */
  async searchPosts(meId: string, query: string) {
    const q = query.trim();
    if (!q) return [];
    const friendIds = await this.friendIds(meId);
    const posts = await this.prisma.post.findMany({
      where: {
        content: { contains: q, mode: 'insensitive' },
        OR: [
          { authorId: meId },
          { authorId: { in: friendIds }, visibility: { not: 'private' } },
          { visibility: 'public' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: this.postInclude(meId),
    });
    return posts.map((p) => this.format(p as RawPost, meId));
  }

  /** Muro de un usuario, respetando la visibilidad de cada publicación. */
  async wall(meId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Qué visibilidades puede ver quien mira: uno mismo todo; un amigo lo
    // público y de amigos; un desconocido solo lo público.
    let visibility: { in: string[] } | undefined;
    if (meId !== user.id) {
      visibility = (await this.areFriends(meId, user.id))
        ? { in: ['public', 'friends'] }
        : { in: ['public'] };
    }

    const posts = await this.prisma.post.findMany({
      where: { authorId: user.id, ...(visibility ? { visibility } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.postInclude(meId),
    });
    return posts.map((p) => this.format(p as RawPost, meId));
  }

  async deletePost(meId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    if (post.authorId !== meId) {
      throw new ForbiddenException('No puedes borrar esta publicación');
    }
    await this.prisma.post.delete({ where: { id: postId } });
    return { ok: true };
  }

  /** Reacciona (o cambia la reacción) a una publicación. */
  async react(meId: string, postId: string, type: string) {
    const reaction = REACTION_TYPES.includes(type as ReactionType)
      ? type
      : 'like';
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId: meId } },
      select: { id: true },
    });
    await this.prisma.like.upsert({
      where: { postId_userId: { postId, userId: meId } },
      create: { postId, userId: meId, type: reaction },
      update: { type: reaction },
    });
    // Notificamos al autor solo la primera vez.
    if (!existing) {
      await this.notifications.create(post.authorId, meId, 'like', postId);
    }
    return { ok: true };
  }

  async unreact(meId: string, postId: string) {
    await this.prisma.like.deleteMany({ where: { postId, userId: meId } });
    return { ok: true };
  }

  async addComment(
    meId: string,
    postId: string,
    content: string,
    parentId?: string,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');

    let parent: { authorId: string } | null = null;
    if (parentId) {
      parent = await this.prisma.comment.findFirst({
        where: { id: parentId, postId },
        select: { authorId: true },
      });
      if (!parent) throw new NotFoundException('Comentario no encontrado');
    }

    const comment = await this.prisma.comment.create({
      data: { postId, authorId: meId, content, parentId: parentId ?? null },
      include: { author: { select: publicUser } },
    });
    await this.notifications.create(post.authorId, meId, 'comment', postId);
    if (parent) {
      await this.notifications.create(parent.authorId, meId, 'comment', postId);
    }
    await this.notifyMentions(content, meId, postId);
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.author,
      parentId: parentId ?? null,
      likeCount: 0,
      likedByMe: false,
      replies: [],
    };
  }

  async listComments(postId: string, meId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: publicUser },
        likes: { select: { userId: true } },
      },
    });
    const fmt = (c: (typeof comments)[number]) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: c.author,
      parentId: c.parentId,
      likeCount: c.likes.length,
      likedByMe: c.likes.some((l) => l.userId === meId),
      replies: [] as ReturnType<typeof fmt>[],
    });
    const byId = new Map(comments.map((c) => [c.id, fmt(c)]));
    const roots: ReturnType<typeof fmt>[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.replies.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }

  async likeComment(meId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true },
    });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    const existing = await this.prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId: meId } },
      select: { id: true },
    });
    await this.prisma.commentLike.upsert({
      where: { commentId_userId: { commentId, userId: meId } },
      create: { commentId, userId: meId },
      update: {},
    });
    if (!existing) {
      await this.notifications.create(
        comment.authorId,
        meId,
        'like',
        comment.postId,
      );
    }
    return { ok: true };
  }

  async unlikeComment(meId: string, commentId: string) {
    await this.prisma.commentLike.deleteMany({
      where: { commentId, userId: meId },
    });
    return { ok: true };
  }
}
