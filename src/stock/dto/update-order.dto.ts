import { IsEnum, IsOptional, IsInt, IsDate } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsDate()
  date?: Date;
}
