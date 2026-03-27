import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { TagGroupType } from '@prisma/client';

export class CreateTagDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEnum(TagGroupType)
  groupType: TagGroupType;
}
