import { BadRequestException } from '@nestjs/common';
import { PostsService } from './posts.service';

const author = {
  id: 'u1',
  username: 'jose',
  displayName: 'José',
  avatarUrl: null,
};

/** Construye un post tal como lo devuelve Prisma con el include del servicio. */
function rawPost(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    authorId: 'u1',
    content: 'hola',
    imageUrl: null,
    videoUrl: null,
    visibility: 'public',
    createdAt: new Date('2026-01-01'),
    author,
    _count: { comments: 0 },
    likes: [],
    saves: [],
    sharedPost: null,
    ...over,
  };
}

function makePrisma() {
  return {
    post: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    friendship: { findMany: jest.fn().mockResolvedValue([]) },
    block: { findMany: jest.fn().mockResolvedValue([]) },
    follow: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

const notifications = { create: jest.fn() };

describe('PostsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: PostsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new PostsService(prisma as never, notifications as never);
  });

  describe('createPost', () => {
    it('rechaza una publicación totalmente vacía', async () => {
      await expect(service.createPost('u1', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('crea un reel cuando solo hay vídeo (sin texto)', async () => {
      prisma.post.create.mockResolvedValue(
        rawPost({ content: '', videoUrl: '/uploads/r.webm' }),
      );
      const res = await service.createPost('u1', {
        videoUrl: '/uploads/r.webm',
      });
      expect(res.videoUrl).toBe('/uploads/r.webm');
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ videoUrl: '/uploads/r.webm' }),
        }),
      );
    });
  });

  describe('reels', () => {
    it('solo pide publicaciones con vídeo y las formatea', async () => {
      prisma.post.findMany.mockResolvedValue([
        rawPost({ id: 'r1', videoUrl: '/uploads/a.webm', likes: [{ userId: 'u2', type: 'love' }] }),
      ]);

      const res = await service.reels('me');

      expect(res).toHaveLength(1);
      expect(res[0].videoUrl).toBe('/uploads/a.webm');
      expect(res[0].reactionCount).toBe(1);
      // El filtro exige videoUrl no nulo.
      const where = prisma.post.findMany.mock.calls[0][0].where;
      expect(where.videoUrl).toEqual({ not: null });
    });

    it('devuelve vacío si no hay reels', async () => {
      prisma.post.findMany.mockResolvedValue([]);
      const res = await service.reels('me');
      expect(res).toEqual([]);
    });
  });
});
