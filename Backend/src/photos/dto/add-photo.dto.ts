import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddPhotoDto {
  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;
}
