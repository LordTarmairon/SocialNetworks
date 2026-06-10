import { ArrayMinSize, IsArray, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  memberIds: string[];
}
