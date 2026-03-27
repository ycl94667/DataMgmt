import {
  IsNotEmpty,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateAdminDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsNotEmpty()
  @IsString()
  realName: string;

  @IsNotEmpty()
  @IsEnum(['super_admin', 'admin'])
  role: 'super_admin' | 'admin';
}
