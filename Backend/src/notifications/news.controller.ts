import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NewsService } from './news.service';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('me/news')
export class NewsController {
  constructor(
    private readonly news: NewsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  get(@CurrentUser() me: AuthUser) {
    return this.news.getNews(me.id);
  }

  /** Marca todas las notificaciones como leídas. */
  @Post('read')
  markRead(@CurrentUser() me: AuthUser) {
    return this.notifications.markAllRead(me.id);
  }
}
