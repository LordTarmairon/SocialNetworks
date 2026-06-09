import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('settings')
  updateSettings(@CurrentUser() me: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.users.updateSettings(me.id, dto);
  }
}
