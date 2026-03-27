import { IsOptional, IsString, IsEnum, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { VideoPlatform } from '@prisma/client';

export class UpdateVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(VideoPlatform)
  platform?: VideoPlatform;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  isEnabled?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  projectIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  tagIds?: number[];
}
