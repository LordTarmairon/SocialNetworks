import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [MessagesModule],
  controllers: [NewsController],
  providers: [NotificationsService, NewsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
