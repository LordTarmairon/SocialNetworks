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
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get('feed')
  feed(@CurrentUser() me: AuthUser) {
    return this.posts.feed(me.id);
  }

  @Post('posts')
  create(@CurrentUser() me: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.createPost(me.id, dto);
  }

  @Delete('posts/:id')
  remove(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.deletePost(me.id, id);
  }

  @Post('posts/:id/like')
  like(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.like(me.id, id);
  }

  @Delete('posts/:id/like')
  unlike(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.unlike(me.id, id);
  }

  @Get('posts/:id/comments')
  comments(@Param('id') id: string) {
    return this.posts.listComments(id);
  }

  @Post('posts/:id/comments')
  addComment(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.posts.addComment(me.id, id, dto.content);
  }
}
