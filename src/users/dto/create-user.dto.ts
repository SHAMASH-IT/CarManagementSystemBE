import { IsString, IsEmail, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  hash: string;  // N'oublie pas de hacher le mot de passe avant de le sauvegarder.

  @IsEnum(Role)
  role: Role;
    @IsString()
    matf?: string;
}
