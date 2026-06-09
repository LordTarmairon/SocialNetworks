import { IsIn } from 'class-validator';

export class RsvpDto {
  @IsIn(['going', 'maybe', 'declined'], {
    message: 'Estado no válido',
  })
  status: 'going' | 'maybe' | 'declined';
}
