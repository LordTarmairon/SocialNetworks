import { IsUUID } from 'class-validator';

export class StartConversationDto {
  @IsUUID('4', { message: 'userId debe ser un UUID válido' })
  userId: string;
}
