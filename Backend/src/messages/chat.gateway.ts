import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';

interface SendPayload {
  conversationId: string;
  content: string;
}

/**
 * Gateway de chat en tiempo real.
 * El cliente se conecta pasando el JWT en `auth.token`. Cada usuario se une a
 * una sala `user:<id>`, de modo que un mensaje se entrega a todos los
 * participantes de la conversación esté donde esté conectado.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly messages: MessagesService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization ?? '').replace('Bearer ', '');
      const payload = this.jwt.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;
      void client.join(`user:${payload.sub}`);
    } catch {
      // Token inválido o ausente: cerramos la conexión.
      client.disconnect(true);
    }
  }

  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: SendPayload,
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      return { error: 'No autenticado' };
    }

    const content = (body?.content ?? '').trim();
    if (!content || !body?.conversationId) {
      return { error: 'Mensaje inválido' };
    }

    try {
      const message = await this.messages.sendMessage(
        userId,
        body.conversationId,
        content,
      );
      const participants = await this.messages.participantIds(
        body.conversationId,
      );
      // Emitimos a todos los participantes (incluido el emisor, para sincronizar
      // entre sus dispositivos).
      for (const pid of participants) {
        this.server.to(`user:${pid}`).emit('message:new', message);
      }
      return { ok: true, message };
    } catch (err) {
      this.logger.warn(`message:send rechazado: ${(err as Error).message}`);
      return { error: 'No se pudo enviar el mensaje' };
    }
  }

  /** Indicador "escribiendo…": se reenvía al otro participante. */
  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId || !body?.conversationId) return;
    const participants = await this.messages.participantIds(
      body.conversationId,
    );
    for (const pid of participants) {
      if (pid !== userId) {
        this.server
          .to(`user:${pid}`)
          .emit('typing', { conversationId: body.conversationId, userId });
      }
    }
  }
}
