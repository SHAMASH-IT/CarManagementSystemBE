import { Role } from '@prisma/client';
import { IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  @IsOptional()
  newPassword?: string;
  
  @IsEnum(Role)
  @IsOptional()
  role?: Role
  @IsString()
  @IsOptional()
  matf?: string;
}
