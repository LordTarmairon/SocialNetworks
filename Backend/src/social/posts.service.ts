import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

type RawPost = {
  id: string;
  authorId: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  _count: { likes: number; comments: number };
  likes: { id: string }[];
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private format(p: RawPost) {
    return {
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      author: p.author,
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      likedByMe: p.likes.length > 0,
    };
  }

  private postInclude(meId: string) {
    return {
      author: { select: publicUser },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: meId }, select: { id: true } },
    };
  }

  async createPost(
    meId: string,
    data: { content?: string; imageUrl?: string },
  ) {
    const content = (data.content ?? '').trim();
    if (!content && !data.imageUrl) {
      throw new BadRequestException('La publicación está vacía');
    }
    const post = await this.prisma.post.create({
      data: { authorId: meId, content, imageUrl: data.imageUrl ?? null },
      include: this.postInclude(meId),
    });
    return this.format(post as RawPost);
  }

  /** Feed: publicaciones propias y de los amigos. */
  async feed(meId: string) {
    const authorIds = [meId, ...(await this.friendIds(meId))];
    const posts = await this.prisma.post.findMany({
      where: { authorId: { in: authorIds } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.postInclude(meId),
    });
    return posts.map((p) => this.format(p as RawPost));
  }

  /** Muro de un usuario (visible solo para él y sus amigos). */
  async wall(meId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!(await this.areFriends(meId, user.id))) {
      throw new ForbiddenException('Solo los contactos ven este muro');
    }
    const posts = await this.prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: this.postInclude(meId),
    });
    return posts.map((p) => this.format(p as RawPost));
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

  async like(meId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    await this.prisma.like.upsert({
      where: { postId_userId: { postId, userId: meId } },
      create: { postId, userId: meId },
      update: {},
    });
    return { ok: true };
  }

  async unlike(meId: string, postId: string) {
    await this.prisma.like.deleteMany({ where: { postId, userId: meId } });
    return { ok: true };
  }

  async addComment(meId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Publicación no encontrada');
    const comment = await this.prisma.comment.create({
      data: { postId, authorId: meId, content },
      include: { author: { select: publicUser } },
    });
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.author,
    };
  }

  async listComments(postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: publicUser } },
    });
    return comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: c.author,
    }));
  }
}
