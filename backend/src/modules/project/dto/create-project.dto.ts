import { IsNotEmpty, IsString, IsInt, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectTypeEnum {
  WRITTEN_EXAM = 'written_exam',
  INTERVIEW = 'interview',
}

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @IsNotEmpty()
  @IsString()
  year: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  provinceId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  cityId: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  districtId: number;

  @IsNotEmpty()
  @IsEnum(ProjectTypeEnum)
  type: ProjectTypeEnum;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
