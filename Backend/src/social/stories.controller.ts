import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  @Post(':id/view')
  view(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.stories.recordView(me.id, id);
  }

  @Post(':id/react')
  react(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body('emoji') emoji: string,
  ) {
    return this.stories.reactToStory(me.id, id, emoji);
  }

  @Delete(':id/react')
  unreact(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.stories.unreactStory(me.id, id);
  }

  @Get(':id/viewers')
  viewers(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.stories.getViewers(me.id, id);
  }

  @Post(':id/comment')
  comment(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.stories.comment(me.id, id, content);
  }

  @Get(':id/comments')
  comments(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.stories.listComments(me.id, id);
  }
}
