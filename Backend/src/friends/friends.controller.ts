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
import { SendRequestDto } from './dto/send-request.dto';
import { FriendsService } from './friends.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get('users/search')
  search(@CurrentUser() me: AuthUser, @Query('q') q = '') {
    return this.friends.search(me.id, q);
  }

  @Get('friends')
  listFriends(@CurrentUser() me: AuthUser) {
    return this.friends.listFriends(me.id);
  }

  @Get('friends/requests')
  listRequests(@CurrentUser() me: AuthUser) {
    return this.friends.listIncomingRequests(me.id);
  }

  @Post('friends/requests')
  sendRequest(@CurrentUser() me: AuthUser, @Body() dto: SendRequestDto) {
    return this.friends.sendRequest(me.id, dto.addresseeId);
  }

  @Post('friends/requests/:id/accept')
  accept(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.friends.acceptRequest(me.id, id);
  }

  @Delete('friends/requests/:id')
  remove(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.friends.removeRelation(me.id, id);
  }

  @Get('me/blocked')
  blocked(@CurrentUser() me: AuthUser) {
    return this.friends.listBlocked(me.id);
  }

  @Post('users/:username/block')
  block(@CurrentUser() me: AuthUser, @Param('username') username: string) {
    return this.friends.block(me.id, username);
  }

  @Delete('users/:username/block')
  unblock(@CurrentUser() me: AuthUser, @Param('username') username: string) {
    return this.friends.unblock(me.id, username);
  }
}
