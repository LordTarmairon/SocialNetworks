import {
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

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---- Álbumes -------------------------------------------------------------

  async createAlbum(meId: string, title: string, description?: string) {
    const album = await this.prisma.album.create({
      data: { ownerId: meId, title, description: description ?? null },
    });
    return { ...album, photoCount: 0, coverUrl: null };
  }

  /** Álbumes de un usuario (por username), con portada y nº de fotos. */
  async listAlbums(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const albums = await this.prisma.album.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        photos: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { photos: true } },
      },
    });
    return albums.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      createdAt: a.createdAt,
      photoCount: a._count.photos,
      coverUrl: a.photos[0]?.url ?? null,
    }));
  }

  async getAlbum(albumId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
      include: {
        owner: { select: publicUser },
        photos: {
          orderBy: { createdAt: 'asc' },
          include: {
            owner: { select: publicUser },
            tags: { include: { user: { select: publicUser } } },
          },
        },
      },
    });
    if (!album) throw new NotFoundException('Álbum no encontrado');
    return album;
  }

  async deleteAlbum(meId: string, albumId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
      select: { ownerId: true },
    });
    if (!album) throw new NotFoundException('Álbum no encontrado');
    if (album.ownerId !== meId) throw new ForbiddenException('No es tu álbum');
    await this.prisma.album.delete({ where: { id: albumId } });
    return { ok: true };
  }

  // ---- Fotos ---------------------------------------------------------------

  async addPhoto(
    meId: string,
    albumId: string,
    url: string,
    caption?: string,
  ) {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
      select: { ownerId: true },
    });
    if (!album) throw new NotFoundException('Álbum no encontrado');
    if (album.ownerId !== meId) throw new ForbiddenException('No es tu álbum');
    const photo = await this.prisma.photo.create({
      data: { albumId, ownerId: meId, url, caption: caption ?? null },
    });
    if (caption) await this.notifyMentions(caption, meId);
    return this.getPhoto(photo.id);
  }

  async getPhoto(photoId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        owner: { select: publicUser },
        tags: { include: { user: { select: publicUser } } },
      },
    });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    return {
      id: photo.id,
      albumId: photo.albumId,
      url: photo.url,
      caption: photo.caption,
      createdAt: photo.createdAt,
      owner: photo.owner,
      tags: photo.tags.map((t) => ({
        id: t.id,
        x: t.x,
        y: t.y,
        user: t.user,
      })),
    };
  }

  async updateCaption(meId: string, photoId: string, caption?: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      select: { ownerId: true },
    });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    if (photo.ownerId !== meId) throw new ForbiddenException('No es tu foto');
    await this.prisma.photo.update({
      where: { id: photoId },
      data: { caption: caption ?? null },
    });
    if (caption) await this.notifyMentions(caption, meId);
    return this.getPhoto(photoId);
  }

  async deletePhoto(meId: string, photoId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      select: { ownerId: true },
    });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    if (photo.ownerId !== meId) throw new ForbiddenException('No es tu foto');
    await this.prisma.photo.delete({ where: { id: photoId } });
    return { ok: true };
  }

  // ---- Etiquetas -----------------------------------------------------------

  async tagUser(
    meId: string,
    photoId: string,
    userId: string,
    x?: number,
    y?: number,
  ) {
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
      select: { id: true },
    });
    if (!photo) throw new NotFoundException('Foto no encontrada');
    await this.prisma.photoTag.upsert({
      where: { photoId_userId: { photoId, userId } },
      create: { photoId, userId, taggerId: meId, x: x ?? null, y: y ?? null },
      update: { x: x ?? null, y: y ?? null },
    });
    await this.notifications.create(userId, meId, 'photo_tag');
    return this.getPhoto(photoId);
  }

  async removeTag(meId: string, photoId: string, tagId: string) {
    const tag = await this.prisma.photoTag.findUnique({
      where: { id: tagId },
      include: { photo: { select: { ownerId: true } } },
    });
    if (!tag || tag.photoId !== photoId) {
      throw new NotFoundException('Etiqueta no encontrada');
    }
    // Puede quitarla quien etiquetó, el dueño de la foto o el etiquetado.
    if (
      tag.taggerId !== meId &&
      tag.userId !== meId &&
      tag.photo.ownerId !== meId
    ) {
      throw new ForbiddenException('No puedes quitar esta etiqueta');
    }
    await this.prisma.photoTag.delete({ where: { id: tagId } });
    return this.getPhoto(photoId);
  }

  /** Notifica a los @mencionados en un pie de foto. */
  private async notifyMentions(text: string, authorId: string) {
    const usernames = [
      ...new Set(
        (text.match(/@([a-zA-Z0-9_]+)/g) ?? []).map((m) => m.slice(1)),
      ),
    ];
    if (usernames.length === 0) return;
    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true },
    });
    for (const u of users) {
      await this.notifications.create(u.id, authorId, 'mention');
    }
  }
}
