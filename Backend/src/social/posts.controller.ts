import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
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

  @Get('search/posts')
  searchPosts(@CurrentUser() me: AuthUser, @Query('q') q = '') {
    return this.posts.searchPosts(me.id, q);
  }

  @Get('discover/photos')
  recommended(@CurrentUser() me: AuthUser) {
    return this.posts.recommendedPhotos(me.id);
  }

  @Post('posts')
  create(@CurrentUser() me: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.createPost(me.id, dto);
  }

  @Delete('posts/:id')
  remove(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.deletePost(me.id, id);
  }

  @Post('posts/:id/react')
  react(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body('type') type: string,
  ) {
    return this.posts.react(me.id, id, type ?? 'like');
  }

  @Delete('posts/:id/react')
  unreact(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.unreact(me.id, id);
  }

  // Compatibilidad: like simple.
  @Post('posts/:id/like')
  like(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.react(me.id, id, 'like');
  }

  @Delete('posts/:id/like')
  unlike(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.unreact(me.id, id);
  }

  @Get('posts/:id/comments')
  comments(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.listComments(id, me.id);
  }

  @Post('posts/:id/comments')
  addComment(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.posts.addComment(me.id, id, dto.content, dto.parentId);
  }

  // Likes en comentarios
  @Post('comments/:id/like')
  likeComment(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.likeComment(me.id, id);
  }

  @Delete('comments/:id/like')
  unlikeComment(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.unlikeComment(me.id, id);
  }

  // Guardar publicaciones
  @Get('me/saved')
  saved(@CurrentUser() me: AuthUser) {
    return this.posts.listSaved(me.id);
  }

  @Post('posts/:id/save')
  save(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.savePost(me.id, id);
  }

  @Delete('posts/:id/save')
  unsave(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.posts.unsavePost(me.id, id);
  }
}
