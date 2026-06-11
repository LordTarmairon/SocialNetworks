import { ChatGateway } from './chat.gateway';

/** Servidor socket.io mockeado: registra a qué salas se emite. */
function makeServer() {
  const emits: { room: string; event: string; data: unknown }[] = [];
  const to = jest.fn((room: string) => ({
    emit: (event: string, data: unknown) => {
      emits.push({ room, event, data });
    },
  }));
  return { server: { to } as never, emits };
}

describe('ChatGateway · señalización de llamadas', () => {
  const messages = {
    participantIds: jest.fn().mockResolvedValue(['caller', 'other']),
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'caller',
        displayName: 'Quien Llama',
        avatarUrl: null,
      }),
    },
  };

  let gateway: ChatGateway;
  let emits: { room: string; event: string; data: unknown }[];

  beforeEach(() => {
    gateway = new ChatGateway(
      {} as never,
      messages as never,
      {} as never,
      prisma as never,
    );
    const srv = makeServer();
    gateway.server = srv.server;
    emits = srv.emits;
  });

  const caller = { data: { userId: 'caller' } } as never;

  it('reenvía la oferta solo al otro participante como call:incoming', async () => {
    await gateway.onCallOffer(caller, {
      conversationId: 'c1',
      sdp: { type: 'offer' },
      video: true,
    });

    expect(emits).toHaveLength(1);
    expect(emits[0].room).toBe('user:other');
    expect(emits[0].event).toBe('call:incoming');
    expect(emits[0].data).toMatchObject({
      conversationId: 'c1',
      video: true,
      from: { id: 'caller' },
    });
  });

  it('no reenvía nada si quien emite no es participante', async () => {
    await gateway.onCallEnd({ data: { userId: 'intruso' } } as never, {
      conversationId: 'c1',
      reason: 'hangup',
    });
    expect(emits).toHaveLength(0);
  });

  it('reenvía el fin de llamada al otro participante', async () => {
    await gateway.onCallEnd(caller, { conversationId: 'c1', reason: 'reject' });
    expect(emits).toHaveLength(1);
    expect(emits[0].room).toBe('user:other');
    expect(emits[0].event).toBe('call:end');
    expect(emits[0].data).toMatchObject({ reason: 'reject' });
  });
});
