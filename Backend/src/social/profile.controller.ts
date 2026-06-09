import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostsService } from './posts.service';
import { ProfileService } from './profile.service';

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly posts: PostsService,
  ) {}

  @Get(':username')
  get(@CurrentUser() me: AuthUser, @Param('username') username: string) {
    return this.profile.getProfile(me.id, username);
  }

  @Get(':username/posts')
  wall(@CurrentUser() me: AuthUser, @Param('username') username: string) {
    return this.posts.wall(me.id, username);
  }
}
