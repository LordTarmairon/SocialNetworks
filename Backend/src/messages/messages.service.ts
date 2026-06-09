import {
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

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Verifica que dos usuarios son amigos (relación ACCEPTED). */
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

  /** Comprueba que el usuario participa en la conversación. */
  private async assertParticipant(meId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: meId } },
    });
    if (!participant) {
      throw new NotFoundException('Conversación no encontrada');
    }
  }

  /** Obtiene (o crea) la conversación 1-a-1 entre el usuario actual y otro. */
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
          participants: {
            create: [{ userId: meId }, { userId: otherId }],
          },
        },
      }));

    return this.toSummary(meId, conversation.id);
  }

  /** Lista las conversaciones del usuario con el otro participante y el último mensaje. */
  async listConversations(meId: string) {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { userId: meId },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: publicUser } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return parts.map((p) => {
      const other = p.conversation.participants.find(
        (pp) => pp.userId !== meId,
      );
      const last = p.conversation.messages[0];
      return {
        id: p.conversation.id,
        otherUser: other?.user ?? null,
        lastMessage: last
          ? { content: last.content, createdAt: last.createdAt }
          : null,
        updatedAt: p.conversation.updatedAt,
      };
    });
  }

  /** Devuelve los mensajes de una conversación (más recientes). */
  async listMessages(meId: string, conversationId: string) {
    await this.assertParticipant(meId, conversationId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt,
    }));
  }

  /** Crea un mensaje y actualiza la fecha de la conversación. */
  async sendMessage(meId: string, conversationId: string, content: string) {
    await this.assertParticipant(meId, conversationId);
    const message = await this.prisma.message.create({
      data: { conversationId, senderId: meId, content },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  /** IDs de los participantes (para notificar por WebSocket). */
  async participantIds(conversationId: string): Promise<string[]> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return parts.map((p) => p.userId);
  }

  /** Resumen de una conversación concreta para el usuario actual. */
  private async toSummary(meId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: publicUser } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const other = conv.participants.find((p) => p.userId !== meId);
    const last = conv.messages[0];
    return {
      id: conv.id,
      otherUser: other?.user ?? null,
      lastMessage: last
        ? { content: last.content, createdAt: last.createdAt }
        : null,
      updatedAt: conv.updatedAt,
    };
  }
}
