import { IsUUID } from 'class-validator';

export class SendRequestDto {
  @IsUUID('4', { message: 'addresseeId debe ser un UUID válido' })
  addresseeId: string;
}
