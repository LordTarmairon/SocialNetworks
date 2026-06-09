import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @MinLength(1, { message: 'La story necesita una imagen' })
  @MaxLength(500)
  imageUrl: string;
}
