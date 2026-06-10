import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from './presence.service';

const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

// Para calcular presencia necesitamos también los flags de privacidad.
const participantUser = {
  ...publicUser,
  showLastSeen: true,
  lastSeenAt: true,
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  private async assertFriends(meId: string, otherId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: meId, addresseeId: otherId },
          { requesterId: otherId, addresseeId: meId },
        ],
      },
    });
    if (!friendship) {
      throw new ForbiddenException('Solo puedes chatear con tus contactos');
    }
  }

  private async assertParticipant(meId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: meId } },
    });
    if (!participant) {
      throw new NotFoundException('Conversación no encontrada');
    }
  }

  private async getFlags(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { showReadReceipts: true, showLastSeen: true },
    });
  }

  /** Presencia de un usuario respetando su ajuste "showLastSeen". */
  private presenceOf(user: {
    id: string;
    showLastSeen: boolean;
    lastSeenAt: Date | null;
  }) {
    if (!user.showLastSeen) return null;
    return {
      online: this.presence.isOnline(user.id),
      lastSeenAt: user.lastSeenAt,
    };
  }

  async getOrCreateConversation(meId: string, otherId: string) {
    await this.assertFriends(meId, otherId);

    const candidates = await this.prisma.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId: meId } } },
          { participants: { some: { userId: otherId } } },
        ],
      },
      include: { _count: { select: { participants: true } } },
    });
    const existing = candidates.find((c) => c._count.participants === 2);

    const conversation =
      existing ??
      (await this.prisma.conversation.create({
        data: {
          participants: { create: [{ userId: meId }, { userId: otherId }] },
        },
      }));

    return this.toSummary(meId, conversation.id);
  }

  async listConversations(meId: string) {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { userId: meId },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: participantUser } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return parts.map((p) => {
      const other = p.conversation.participants.find(
        (pp) => pp.userId !== meId,
      )?.user;
      const last = p.conversation.messages[0];
      return {
        id: p.conversation.id,
        otherUser: other ? this.toPublic(other) : null,
        presence: other ? this.presenceOf(other) : null,
        lastMessage: last
          ? {
              content: this.preview(last),
              createdAt: last.createdAt,
              senderId: last.senderId,
            }
          : null,
        updatedAt: p.conversation.updatedAt,
      };
    });
  }

  /** Texto resumido del último mensaje (para la lista de chats). */
  private preview(m: { content: string; attachmentUrl: string | null }) {
    if (m.attachmentUrl && !m.content) return '📷 Foto';
    return m.content;
  }

  private readonly messageInclude = {
    replyTo: {
      select: {
        id: true,
        senderId: true,
        content: true,
        attachmentUrl: true,
      },
    },
    reactions: { select: { userId: true, emoji: true } },
  } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatMessage(m: any, showReadReceipts: boolean) {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt,
      readAt: showReadReceipts ? m.readAt : null,
      replyTo: m.replyTo
        ? {
            id: m.replyTo.id,
            senderId: m.replyTo.senderId,
            content: m.replyTo.content,
            attachmentUrl: m.replyTo.attachmentUrl,
          }
        : null,
      reactions: (m.reactions ?? []).map(
        (r: { userId: string; emoji: string }) => ({
          userId: r.userId,
          emoji: r.emoji,
        }),
      ),
    };
  }

  async listMessages(meId: string, conversationId: string) {
    await this.assertParticipant(meId, conversationId);
    const me = await this.getFlags(meId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: this.messageInclude,
    });
    return messages.map((m) => this.formatMessage(m, me.showReadReceipts));
  }

  async sendMessage(
    meId: string,
    conversationId: string,
    content: string,
    attachmentUrl?: string | null,
    replyToId?: string | null,
  ) {
    await this.assertParticipant(meId, conversationId);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: meId,
        content,
        attachmentUrl: attachmentUrl ?? null,
        replyToId: replyToId ?? null,
      },
      include: this.messageInclude,
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return this.formatMessage(message, true);
  }

  /** Reacciona a un mensaje (un emoji por usuario). Devuelve a quién notificar. */
  async reactToMessage(meId: string, messageId: string, emoji: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true },
    });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');
    await this.assertParticipant(meId, msg.conversationId);
    await this.prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId: meId } },
      create: { messageId, userId: meId, emoji },
      update: { emoji },
    });
    return this.reactionState(messageId, msg.conversationId);
  }

  async unreactToMessage(meId: string, messageId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, conversationId: true },
    });
    if (!msg) throw new NotFoundException('Mensaje no encontrado');
    await this.assertParticipant(meId, msg.conversationId);
    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId: meId },
    });
    return this.reactionState(messageId, msg.conversationId);
  }

  /** Estado de reacciones de un mensaje + participantes a notificar. */
  private async reactionState(messageId: string, conversationId: string) {
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { userId: true, emoji: true },
    });
    const notify = await this.participantIds(conversationId);
    return { messageId, conversationId, reactions, notify };
  }

  /**
   * Marca como leídos los mensajes recibidos en una conversación.
   * Solo lo hace si el usuario tiene activadas las confirmaciones de lectura.
   * Devuelve a quién notificar y la fecha, o null si no hay nada/está desactivado.
   */
  async markRead(meId: string, conversationId: string) {
    await this.assertParticipant(meId, conversationId);
    const me = await this.getFlags(meId);
    if (!me.showReadReceipts) return null;

    const now = new Date();
    const result = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: meId }, readAt: null },
      data: { readAt: now },
    });
    if (result.count === 0) return null;

    const others = (await this.participantIds(conversationId)).filter(
      (id) => id !== meId,
    );
    return { conversationId, readAt: now, notify: others };
  }

  async participantIds(conversationId: string): Promise<string[]> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return parts.map((p) => p.userId);
  }

  /** IDs de los amigos aceptados de un usuario (para notificar presencia). */
  async friendIds(userId: string): Promise<string[]> {
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

  private toPublic(u: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
    };
  }

  private async toSummary(meId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: participantUser } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const other = conv.participants.find((p) => p.userId !== meId)?.user;
    const last = conv.messages[0];
    return {
      id: conv.id,
      otherUser: other ? this.toPublic(other) : null,
      presence: other ? this.presenceOf(other) : null,
      lastMessage: last
        ? {
            content: this.preview(last),
            createdAt: last.createdAt,
            senderId: last.senderId,
          }
        : null,
      updatedAt: conv.updatedAt,
    };
  }
}
