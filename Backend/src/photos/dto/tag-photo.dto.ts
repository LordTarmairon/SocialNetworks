import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class TagPhotoDto {
  @IsUUID('4')
  userId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  y?: number;
}
