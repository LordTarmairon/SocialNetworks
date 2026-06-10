import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

// Campos públicos de un usuario (nunca exponemos passwordHash ni email ajeno).
const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

export type RelationStatus =
  | 'none'
  | 'friends'
  | 'pending_outgoing'
  | 'pending_incoming';

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** IDs de usuarios bloqueados por mí o que me han bloqueado. */
  async blockedIds(meId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: meId }, { blockedId: meId }] },
      select: { blockerId: true, blockedId: true },
    });
    return blocks.map((b) =>
      b.blockerId === meId ? b.blockedId : b.blockerId,
    );
  }

  /** Busca usuarios por username o nombre, anotando la relación con el actual. */
  async search(meId: string, query: string) {
    const q = query.trim();
    if (!q) return [];

    const blocked = await this.blockedIds(meId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: meId, notIn: blocked },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: publicUser,
      take: 20,
    });

    // Relaciones existentes entre el usuario actual y los resultados.
    const ids = users.map((u) => u.id);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: meId, addresseeId: { in: ids } },
          { addresseeId: meId, requesterId: { in: ids } },
        ],
      },
    });

    return users.map((u) => {
      const rel = friendships.find(
        (f) => f.requesterId === u.id || f.addresseeId === u.id,
      );
      let status: RelationStatus = 'none';
      if (rel) {
        if (rel.status === 'ACCEPTED') status = 'friends';
        else if (rel.requesterId === meId) status = 'pending_outgoing';
        else status = 'pending_incoming';
      }
      return { ...u, relation: status };
    });
  }

  /** Lista de amigos aceptados del usuario actual. */
  async listFriends(meId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: meId }, { addresseeId: meId }],
      },
      include: {
        requester: { select: publicUser },
        addressee: { select: publicUser },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Devolvemos "el otro" usuario de cada relación.
    return friendships.map((f) =>
      f.requesterId === meId ? f.addressee : f.requester,
    );
  }

  /** Solicitudes de amistad pendientes recibidas por el usuario actual. */
  async listIncomingRequests(meId: string) {
    const requests = await this.prisma.friendship.findMany({
      where: { addresseeId: meId, status: 'PENDING' },
      include: { requester: { select: publicUser } },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => ({
      requestId: r.id,
      user: r.requester,
      createdAt: r.createdAt,
    }));
  }

  /** Envía una solicitud de amistad al usuario indicado. */
  async sendRequest(meId: string, addresseeId: string) {
    if (addresseeId === meId) {
      throw new BadRequestException('No puedes agregarte a ti mismo');
    }

    const addressee = await this.prisma.user.findUnique({
      where: { id: addresseeId },
      select: { id: true },
    });
    if (!addressee) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const blocked = await this.blockedIds(meId);
    if (blocked.includes(addresseeId)) {
      throw new BadRequestException('No puedes agregar a este usuario');
    }

    // ¿Ya existe relación en cualquier dirección?
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: meId, addresseeId },
          { requesterId: addresseeId, addresseeId: meId },
        ],
      },
    });
    if (existing) {
      throw new ConflictException(
        existing.status === 'ACCEPTED'
          ? 'Ya sois amigos'
          : 'Ya existe una solicitud entre vosotros',
      );
    }

    await this.prisma.friendship.create({
      data: { requesterId: meId, addresseeId },
    });
    await this.notifications.create(addresseeId, meId, 'friend_request');
    return { ok: true };
  }

  /** Acepta una solicitud recibida. */
  async acceptRequest(meId: string, requestId: string) {
    const req = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });
    if (!req || req.addresseeId !== meId || req.status !== 'PENDING') {
      throw new NotFoundException('Solicitud no encontrada');
    }
    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });
    // Avisamos a quien envió la solicitud de que la aceptaste.
    await this.notifications.create(req.requesterId, meId, 'friend_accept');
    return { ok: true };
  }

  /** Rechaza una solicitud recibida o cancela/elimina una relación propia. */
  async removeRelation(meId: string, requestId: string) {
    const req = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });
    if (!req || (req.addresseeId !== meId && req.requesterId !== meId)) {
      throw new NotFoundException('Relación no encontrada');
    }
    await this.prisma.friendship.delete({ where: { id: requestId } });
    return { ok: true };
  }

  /** Bloquea a un usuario: elimina amistad/solicitudes y crea el bloqueo. */
  async block(meId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.id === meId) {
      throw new BadRequestException('No puedes bloquearte a ti mismo');
    }
    // Eliminamos cualquier amistad o solicitud entre ambos.
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: meId, addresseeId: user.id },
          { requesterId: user.id, addresseeId: meId },
        ],
      },
    });
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: meId, blockedId: user.id } },
      create: { blockerId: meId, blockedId: user.id },
      update: {},
    });
    return { ok: true };
  }

  async unblock(meId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.prisma.block.deleteMany({
      where: { blockerId: meId, blockedId: user.id },
    });
    return { ok: true };
  }

  async listBlocked(meId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: meId },
      include: { blocked: { select: publicUser } },
      orderBy: { createdAt: 'desc' },
    });
    return blocks.map((b) => b.blocked);
  }

  /** ¿He bloqueado yo a este usuario? */
  async hasBlocked(meId: string, otherId: string): Promise<boolean> {
    const b = await this.prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: meId, blockedId: otherId } },
      select: { id: true },
    });
    return !!b;
  }
}
