import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DocTypeEnum {
  EXAM_MATERIALS = 'exam_materials',
  POSITION_TABLE = 'position_table',
  WRITTEN_SCORE = 'written_score',
  INTERVIEW_SCORE = 'interview_score',
  INTERVIEW_LINE = 'interview_line',
  REAL_EXAM = 'real_exam',
  COURSE_MATERIALS = 'course_materials',
  OTHER = 'other',
}

export class CreateDocumentDto {
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
  @IsEnum(DocTypeEnum)
  docType: DocTypeEnum;

  @IsNotEmpty()
  @IsString()
  filePath: string;

  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  fileSize: number;

  @IsNotEmpty()
  @IsString()
  fileExt: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  projectIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  tagIds?: number[];
}
