import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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

  @Post()
  start(@CurrentUser() me: AuthUser, @Body() dto: StartConversationDto) {
    return this.messages.getOrCreateConversation(me.id, dto.userId);
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
