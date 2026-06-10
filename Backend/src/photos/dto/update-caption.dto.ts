import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCaptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  caption?: string;
}
