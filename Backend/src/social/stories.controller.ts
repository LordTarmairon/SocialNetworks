import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateStoryDto } from './dto/create-story.dto';
import { StoriesService } from './stories.service';

@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Get()
  list(@CurrentUser() me: AuthUser) {
    return this.stories.listActive(me.id);
  }

  @Post()
  create(@CurrentUser() me: AuthUser, @Body() dto: CreateStoryDto) {
    return this.stories.create(me.id, dto.imageUrl);
  }
}
