import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateParkingDto } from "./dto/create-parking.dto";
import {UpdateParkingDto } from "./dto/update-parking.dto";
import { Status } from "@prisma/client";

@Injectable()
export class ParkingService {
  constructor(private prisma: PrismaService) {}

  // ✅ 1. Créer un parking
  async createParking(dto: CreateParkingDto) {
    return this.prisma.parking.create({
      data: {
        name: dto.name,
        status: dto.status || Status.PENDING,
        serviceId: dto.serviceId,
      },
    });
  }

  // ✅ 2. Récupérer tous les parkings
  async getAllParkings() {
    return this.prisma.parking.findMany({
      include: { service: true, locations: true }, // Inclut les services et les locations
    });
  }

  // ✅ 3. Récupérer un parking par ID
  async getParkingById(id: number) {
    return this.prisma.parking.findUnique({
      where: { id },
      include: { service: true, locations: true },
    });
  }

  // ✅ 4. Mettre à jour un parking
  async updateParking(id: number, dto: UpdateParkingDto) {
    return this.prisma.parking.update({
      where: { id },
      data: { name: dto.name, status: dto.status },
    });
  }

  // ✅ 5. Supprimer un parking
  async deleteParking(id: number) {
    return this.prisma.parking.delete({
      where: { id },
    });
  }

  
  
  
}
