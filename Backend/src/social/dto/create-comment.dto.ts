import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: 'El comentario no puede estar vacío' })
  @MaxLength(1000)
  content: string;
}
