import { IsNotEmpty, IsString, IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAuthCodeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDownloads?: number = -1;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
