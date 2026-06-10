import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from './messages.service';
import { PresenceService } from './presence.service';

interface SendPayload {
  conversationId: string;
  content: string;
  attachmentUrl?: string;
  replyToId?: string;
  forwarded?: boolean;
}

/**
 * Gateway de chat en tiempo real (mensajes, presencia, "escribiendo…" y "visto").
 * El cliente se conecta pasando el JWT en `auth.token`. Cada usuario se une a
 * una sala `user:<id>`.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly messages: MessagesService,
    private readonly presence: PresenceService,
    private readonly prisma: PrismaService,
  ) {}

  /** Emite un evento a todas las conexiones de un usuario (usado por otros módulos). */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  async handleConnection(client: Socket) {
    let userId: string;
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization ?? '').replace('Bearer ', '');
      userId = this.jwt.verify<{ sub: string }>(token).sub;
    } catch {
      client.disconnect(true);
      return;
    }

    client.data.userId = userId;
    void client.join(`user:${userId}`);

    // Si es la primera conexión del usuario, avisamos a sus contactos.
    const becameOnline = this.presence.add(userId);
    if (becameOnline) {
      await this.broadcastPresence(userId, true, null);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const becameOffline = this.presence.remove(userId);
    if (becameOffline) {
      const lastSeenAt = new Date();
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt },
      });
      await this.broadcastPresence(userId, false, lastSeenAt);
    }
  }

  /** Notifica a los contactos del usuario su nuevo estado de presencia. */
  private async broadcastPresence(
    userId: string,
    online: boolean,
    lastSeenAt: Date | null,
  ) {
    // Respetamos la privacidad: si oculta su última conexión, no avisamos.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { showLastSeen: true },
    });
    if (!user?.showLastSeen) return;

    const friends = await this.messages.friendIds(userId);
    for (const fid of friends) {
      this.server
        .to(`user:${fid}`)
        .emit('presence', { userId, online, lastSeenAt });
    }
  }

  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendPayload,
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return { error: 'No autenticado' };

    const content = (body?.content ?? '').trim();
    const attachmentUrl = body?.attachmentUrl?.trim() || null;
    if ((!content && !attachmentUrl) || !body?.conversationId) {
      return { error: 'Mensaje inválido' };
    }

    try {
      const message = await this.messages.sendMessage(
        userId,
        body.conversationId,
        content,
        attachmentUrl,
        body.replyToId?.trim() || null,
        !!body.forwarded,
      );
      const participants = await this.messages.participantIds(
        body.conversationId,
      );
      for (const pid of participants) {
        this.server.to(`user:${pid}`).emit('message:new', message);
      }
      return { ok: true, message };
    } catch (err) {
      this.logger.warn(`message:send rechazado: ${(err as Error).message}`);
      return { error: 'No se pudo enviar el mensaje' };
    }
  }

  /** Reacción a un mensaje (emoji). */
  @SubscribeMessage('message:react')
  async onReact(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string; emoji: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.messageId || !body?.emoji) return;
    try {
      const state = await this.messages.reactToMessage(
        userId,
        body.messageId,
        body.emoji,
      );
      for (const pid of state.notify) {
        this.server.to(`user:${pid}`).emit('message:reaction', {
          messageId: state.messageId,
          reactions: state.reactions,
        });
      }
    } catch (err) {
      this.logger.warn(`message:react rechazado: ${(err as Error).message}`);
    }
  }

  /** Quitar la reacción a un mensaje. */
  @SubscribeMessage('message:unreact')
  async onUnreact(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.messageId) return;
    try {
      const state = await this.messages.unreactToMessage(
        userId,
        body.messageId,
      );
      for (const pid of state.notify) {
        this.server.to(`user:${pid}`).emit('message:reaction', {
          messageId: state.messageId,
          reactions: state.reactions,
        });
      }
    } catch (err) {
      this.logger.warn(`message:unreact rechazado: ${(err as Error).message}`);
    }
  }

  /** Editar un mensaje propio. */
  @SubscribeMessage('message:edit')
  async onEdit(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string; content: string },
  ) {
    const userId = client.data.userId as string | undefined;
    const content = (body?.content ?? '').trim();
    if (!userId || !body?.messageId || !content) return;
    try {
      const { message, notify } = await this.messages.editMessage(
        userId,
        body.messageId,
        content,
      );
      for (const pid of notify) {
        this.server.to(`user:${pid}`).emit('message:updated', message);
      }
    } catch (err) {
      this.logger.warn(`message:edit rechazado: ${(err as Error).message}`);
    }
  }

  /** Borrar un mensaje propio. */
  @SubscribeMessage('message:delete')
  async onDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.messageId) return;
    try {
      const { message, notify } = await this.messages.deleteMessage(
        userId,
        body.messageId,
      );
      for (const pid of notify) {
        this.server.to(`user:${pid}`).emit('message:updated', message);
      }
    } catch (err) {
      this.logger.warn(`message:delete rechazado: ${(err as Error).message}`);
    }
  }

  /** El usuario abrió/leyó una conversación: marcamos como leídos. */
  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.conversationId) return;

    try {
      const result = await this.messages.markRead(userId, body.conversationId);
      if (!result) return;
      for (const pid of result.notify) {
        this.server.to(`user:${pid}`).emit('message:read', {
          conversationId: result.conversationId,
          readAt: result.readAt,
        });
      }
    } catch (err) {
      this.logger.warn(`message:read rechazado: ${(err as Error).message}`);
    }
  }

  /** Indicador "escribiendo…": se reenvía al otro participante. */
  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string; typing: boolean },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.conversationId) return;
    const participants = await this.messages.participantIds(
      body.conversationId,
    );
    for (const pid of participants) {
      if (pid !== userId) {
        this.server.to(`user:${pid}`).emit('typing', {
          conversationId: body.conversationId,
          userId,
          typing: !!body.typing,
        });
      }
    }
  }
}
