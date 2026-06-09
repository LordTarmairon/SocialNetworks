import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Actualiza los ajustes de privacidad del usuario y los devuelve. */
  async updateSettings(meId: string, dto: UpdateSettingsDto) {
    return this.prisma.user.update({
      where: { id: meId },
      data: {
        ...(dto.showReadReceipts !== undefined && {
          showReadReceipts: dto.showReadReceipts,
        }),
        ...(dto.showLastSeen !== undefined && {
          showLastSeen: dto.showLastSeen,
        }),
      },
      select: { showReadReceipts: true, showLastSeen: true },
    });
  }

  /** Actualiza el perfil (nombre, bio, avatar) y devuelve los datos públicos. */
  async updateProfile(meId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: meId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
      },
    });
  }
}
