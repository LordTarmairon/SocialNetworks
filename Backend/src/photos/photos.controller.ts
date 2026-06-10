import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddPhotoDto } from './dto/add-photo.dto';
import { CreateAlbumDto } from './dto/create-album.dto';
import { TagPhotoDto } from './dto/tag-photo.dto';
import { UpdateCaptionDto } from './dto/update-caption.dto';
import { PhotosService } from './photos.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  // Álbumes
  @Post('albums')
  createAlbum(@CurrentUser() me: AuthUser, @Body() dto: CreateAlbumDto) {
    return this.photos.createAlbum(me.id, dto.title, dto.description);
  }

  @Get('users/:username/albums')
  listAlbums(@Param('username') username: string) {
    return this.photos.listAlbums(username);
  }

  @Get('albums/:id')
  getAlbum(@Param('id') id: string) {
    return this.photos.getAlbum(id);
  }

  @Delete('albums/:id')
  deleteAlbum(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.photos.deleteAlbum(me.id, id);
  }

  // Fotos
  @Post('albums/:id/photos')
  addPhoto(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddPhotoDto,
  ) {
    return this.photos.addPhoto(me.id, id, dto.url, dto.caption);
  }

  @Get('photos/:id')
  getPhoto(@Param('id') id: string) {
    return this.photos.getPhoto(id);
  }

  @Get('photos/:id/comments')
  comments(@Param('id') id: string) {
    return this.photos.listComments(id);
  }

  @Post('photos/:id/comments')
  addComment(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.photos.addComment(me.id, id, content);
  }

  @Patch('photos/:id')
  updateCaption(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCaptionDto,
  ) {
    return this.photos.updateCaption(me.id, id, dto.caption);
  }

  @Delete('photos/:id')
  deletePhoto(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.photos.deletePhoto(me.id, id);
  }

  // Etiquetas
  @Post('photos/:id/tags')
  tag(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() dto: TagPhotoDto,
  ) {
    return this.photos.tagUser(me.id, id, dto.userId, dto.x, dto.y);
  }

  @Delete('photos/:id/tags/:tagId')
  removeTag(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Param('tagId') tagId: string,
  ) {
    return this.photos.removeTag(me.id, id, tagId);
  }
}
