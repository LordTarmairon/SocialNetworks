import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
