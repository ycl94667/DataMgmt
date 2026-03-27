import { IsNotEmpty, IsString, IsOptional, IsEnum, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { VideoPlatform } from '@prisma/client';

export class CreateVideoDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  url: string;

  @IsOptional()
  @IsEnum(VideoPlatform)
  platform?: VideoPlatform = VideoPlatform.other;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  isEnabled?: number = 1;

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
