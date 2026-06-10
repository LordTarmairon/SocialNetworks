import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  visibility?: string;

  @IsOptional()
  @IsString()
  sharedPostId?: string;
}
