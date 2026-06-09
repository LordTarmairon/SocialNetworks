import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

const publicUser = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

type RawEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: Date;
  hostId: string;
  host: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  attendances: { userId: string; status: string }[];
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private async circleIds(meId: string): Promise<string[]> {
    const fs = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: meId }, { addresseeId: meId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const ids = fs.map((f) =>
      f.requesterId === meId ? f.addresseeId : f.requesterId,
    );
    return [meId, ...ids];
  }

  private format(e: RawEvent, meId: string) {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      imageUrl: e.imageUrl,
      startsAt: e.startsAt,
      host: e.host,
      isHost: e.hostId === meId,
      goingCount: e.attendances.filter((a) => a.status === 'going').length,
      maybeCount: e.attendances.filter((a) => a.status === 'maybe').length,
      myStatus:
        e.attendances.find((a) => a.userId === meId)?.status ?? null,
    };
  }

  async create(meId: string, dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        hostId: meId,
        title: dto.title,
        description: dto.description ?? null,
        location: dto.location ?? null,
        imageUrl: dto.imageUrl ?? null,
        startsAt: new Date(dto.startsAt),
        // El anfitrión asiste por defecto.
        attendances: { create: [{ userId: meId, status: 'going' }] },
      },
      include: {
        host: { select: publicUser },
        attendances: { select: { userId: true, status: true } },
      },
    });
    return this.format(event as RawEvent, meId);
  }

  /** Próximos eventos de tu círculo (tuyos y de tus contactos). */
  async listUpcoming(meId: string) {
    const hostIds = await this.circleIds(meId);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const events = await this.prisma.event.findMany({
      where: { hostId: { in: hostIds }, startsAt: { gte: dayAgo } },
      orderBy: { startsAt: 'asc' },
      include: {
        host: { select: publicUser },
        attendances: { select: { userId: true, status: true } },
      },
    });
    return events.map((e) => this.format(e as RawEvent, meId));
  }

  async rsvp(meId: string, eventId: string, status: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    await this.prisma.attendance.upsert({
      where: { eventId_userId: { eventId, userId: meId } },
      create: { eventId, userId: meId, status },
      update: { status },
    });
    return { ok: true };
  }

  async remove(meId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    if (event.hostId !== meId) {
      throw new ForbiddenException('Solo el anfitrión puede borrar el evento');
    }
    await this.prisma.event.delete({ where: { id: eventId } });
    return { ok: true };
  }
}
