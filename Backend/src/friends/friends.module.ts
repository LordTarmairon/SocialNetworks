import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  imports: [NotificationsModule, MessagesModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
