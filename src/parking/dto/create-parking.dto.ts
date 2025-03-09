import { IsString, IsEnum, IsOptional, IsInt } from "class-validator";
import { Status } from "@prisma/client";

export class CreateParkingDto {
  @IsString()
  name: string;

  @IsInt()
  serviceId: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
