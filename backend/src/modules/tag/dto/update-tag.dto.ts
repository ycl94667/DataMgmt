import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TagGroupType } from '@prisma/client';

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TagGroupType)
  groupType?: TagGroupType;
}
