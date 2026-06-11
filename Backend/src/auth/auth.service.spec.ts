import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

/** Prisma mockeado: solo los métodos que usa AuthService. */
function makePrisma() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

const jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

const baseUser = {
  id: 'u1',
  email: null,
  phone: null,
  username: 'jose',
  displayName: 'José',
  avatarUrl: null,
  showReadReceipts: true,
  showLastSeen: true,
};

describe('AuthService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: AuthService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AuthService(prisma as never, jwt as never);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwt.sign.mockClear();
  });

  describe('register', () => {
    it('rechaza el alta sin email ni teléfono', async () => {
      await expect(
        service.register({ displayName: 'X', password: 'supersecreta1' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('da de alta por email (Mellon) y devuelve token', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // email libre
      prisma.user.findUnique.mockResolvedValue(null); // username libre
      prisma.user.create.mockResolvedValue({
        ...baseUser,
        email: 'a@b.com',
        username: 'ana',
        displayName: 'Ana',
      });

      const res = await service.register({
        email: 'a@b.com',
        username: 'ana',
        displayName: 'Ana',
        password: 'supersecreta1',
      } as never);

      expect(res.accessToken).toBe('signed.jwt.token');
      expect(res.user.email).toBe('a@b.com');
      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('da de alta por teléfono (Palantír) generando username de los últimos dígitos', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: { data: { username: string; phone: string } }) =>
        Promise.resolve({ ...baseUser, phone: data.phone, username: data.username }),
      );

      const res = await service.register({
        phone: '+34611223344',
        displayName: 'Tel',
        password: 'supersecreta1',
      } as never);

      expect(res.user.phone).toBe('+34611223344');
      expect(res.user.username).toBe('223344'); // últimos 6 dígitos
    });

    it('rechaza si el email o teléfono ya existen', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(
        service.register({
          email: 'a@b.com',
          displayName: 'Ana',
          password: 'supersecreta1',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza si el username pedido ya existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'someone' }); // username ocupado
      await expect(
        service.register({
          email: 'a@b.com',
          username: 'jose',
          displayName: 'Ana',
          password: 'supersecreta1',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('acepta credenciales correctas (por email, usuario o teléfono)', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...baseUser,
        passwordHash: 'hashed',
      });
      const res = await service.login({ identifier: 'jose', password: 'supersecreta1' });
      expect(res.accessToken).toBe('signed.jwt.token');
      expect(res.user.username).toBe('jose');
    });

    it('rechaza si el usuario no existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.login({ identifier: 'nadie', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza si la contraseña es incorrecta', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, passwordHash: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login({ identifier: 'jose', password: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
