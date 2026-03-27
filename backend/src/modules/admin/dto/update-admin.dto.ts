import {
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password?: string;

  @IsOptional()
  @IsString()
  realName?: string;

  @IsOptional()
  @IsEnum(['super_admin', 'admin'])
  role?: 'super_admin' | 'admin';

  @IsOptional()
  isEnabled?: number;
}
