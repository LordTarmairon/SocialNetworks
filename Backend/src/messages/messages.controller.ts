import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(@CurrentUser() me: AuthUser) {
    return this.messages.listConversations(me.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() me: AuthUser) {
    return this.messages.unreadMessageCount(me.id);
  }

  @Post()
  start(@CurrentUser() me: AuthUser, @Body() dto: StartConversationDto) {
    return this.messages.getOrCreateConversation(me.id, dto.userId);
  }

  @Post('group')
  createGroup(@CurrentUser() me: AuthUser, @Body() dto: CreateGroupDto) {
    return this.messages.createGroup(me.id, dto.name, dto.memberIds);
  }

  @Post(':id/leave')
  leave(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.messages.leaveGroup(me.id, id);
  }

  @Post(':id/members')
  addMembers(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body('memberIds') memberIds: string[],
  ) {
    return this.messages.addMembers(me.id, id, memberIds ?? []);
  }

  @Patch(':id')
  rename(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return this.messages.renameGroup(me.id, id, name ?? '');
  }

  @Get(':id/messages')
  messagesOf(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.messages.listMessages(me.id, id);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.sendMessage(me.id, id, dto.content);
  }
}
