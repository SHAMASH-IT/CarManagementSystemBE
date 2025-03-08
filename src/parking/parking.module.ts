import { Module } from "@nestjs/common";
import { ParkingService } from "./parking.service";
import { ParkingController } from "./parking.controller";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [ParkingController],
  providers: [ParkingService, PrismaService],
})
export class ParkingModule {}
