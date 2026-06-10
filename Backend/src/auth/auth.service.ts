import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // El alta requiere email (Mellon) o teléfono (Palantír).
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Indica un email o un teléfono');
    }

    // ¿Ya existe alguien con ese email/teléfono?
    const taken = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('Ya existe una cuenta con ese email o teléfono');
    }

    // Username: el indicado, o uno generado único (alta por teléfono).
    const username = await this.resolveUsername(dto.username, dto.phone);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        username,
        displayName: dto.displayName,
        passwordHash,
      },
    });

    return this.buildAuthResponse(user.id, user);
  }

  /** Devuelve el username pedido (si está libre) o genera uno único. */
  private async resolveUsername(
    requested: string | undefined,
    phone: string | undefined,
  ): Promise<string> {
    if (requested) {
      const exists = await this.prisma.user.findUnique({
        where: { username: requested },
        select: { id: true },
      });
      if (exists) throw new ConflictException('Ese nombre de usuario ya existe');
      return requested;
    }
    // Base: dígitos finales del teléfono o 'user'.
    const base = (phone?.replace(/\D/g, '').slice(-6) || 'user').padStart(
      3,
      'u',
    );
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}${i}`;
      const exists = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return `user${Date.now()}`;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { username: dto.identifier },
          { phone: dto.identifier },
        ],
      },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.buildAuthResponse(user.id, user);
  }

  /** Construye la respuesta de auth: token + usuario sin datos sensibles. */
  private buildAuthResponse(
    userId: string,
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      showReadReceipts: boolean;
      showLastSeen: boolean;
    },
  ) {
    const token = this.jwt.sign({ sub: userId, username: user.username });
    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        showReadReceipts: user.showReadReceipts,
        showLastSeen: user.showLastSeen,
      },
    };
  }
}
