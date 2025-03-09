import { IsString, IsEnum, IsOptional, IsInt } from "class-validator";
import { Status } from "@prisma/client";

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsInt()
  parkingId: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}