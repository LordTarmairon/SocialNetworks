import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PostsController, ProfileController, StoriesController],
  providers: [PostsService, ProfileService, StoriesService],
})
export class SocialModule {}
