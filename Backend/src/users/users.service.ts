import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Actualiza los ajustes de privacidad del usuario y los devuelve. */
  async updateSettings(meId: string, dto: UpdateSettingsDto) {
    const user = await this.prisma.user.update({
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
    return user;
  }
}
