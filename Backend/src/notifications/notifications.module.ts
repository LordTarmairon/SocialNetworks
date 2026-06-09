import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NewsController],
  providers: [NotificationsService, NewsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
