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
import { CreateEventDto } from './dto/create-event.dto';
import { RsvpDto } from './dto/rsvp.dto';
import { EventsService } from './events.service';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() me: AuthUser) {
    return this.events.listUpcoming(me.id);
  }

  @Post()
  create(@CurrentUser() me: AuthUser, @Body() dto: CreateEventDto) {
    return this.events.create(me.id, dto);
  }

  @Post(':id/rsvp')
  rsvp(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() dto: RsvpDto,
  ) {
    return this.events.rsvp(me.id, id, dto.status);
  }

  @Delete(':id')
  remove(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.events.remove(me.id, id);
  }
}
