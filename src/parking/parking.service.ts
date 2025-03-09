import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateParkingDto } from "./dto/create-parking.dto";
import {UpdateParkingDto } from "./dto/update-parking.dto";
import { Status } from "@prisma/client";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";

@Injectable()
export class ParkingService {
  constructor(private prisma: PrismaService) {}

  //  1. Créer un parking
  async createParking(dto: CreateParkingDto) {
    return this.prisma.parking.create({
      data: {
        name: dto.name,
        status: dto.status || Status.PENDING,
        serviceId: dto.serviceId,
      },
    });
  }

  //  2. Récupérer tous les parkings
  async getAllParkings() {
    return this.prisma.parking.findMany({
      include: { service: true, locations: true }, // Inclut les services et les locations
    });
  }

  //  3. Récupérer un parking par ID
  async getParkingById(id: number) {
    return this.prisma.parking.findUnique({
      where: { id },
      include: { service: true, locations: true },
    });
  }

  //  4. Mettre à jour un parking
  async updateParking(id: number, dto: UpdateParkingDto) {
    return this.prisma.parking.update({
      where: { id },
      data: { name: dto.name, status: dto.status },
    });
  }

  //  5. Supprimer un parking
  async deleteParking(id: number) {
    return this.prisma.parking.delete({
      where: { id },
    });
  }
  //  6. Créer un location
  async createLocation(dto: CreateLocationDto) {
    return this.prisma.location.create({
      data: {
        name: dto.name,
        status: dto.status || Status.PENDING,
        parkingId: dto.parkingId,
      },
    });
  }
  //  7. Récupérer tous les Locations
  async getAllLocations() {
    try {
      return await this.prisma.location.findMany({
        include: { parking: true, positions: true },
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des locations :", error);
      throw new Error("Impossible de récupérer les locations");
    }
  }
  //  8. Récupérer un Location par ID
  async getLocationById(id: number) {
    return this.prisma.location.findUnique({
      where: { id },
      include: { parking: true, positions: true },
    });
  }
  //  9. Mettre à jour un Location
  async updateLocation(id: number, dto: UpdateLocationDto) {
    return this.prisma.location.update({
      where: { id },
      data: { name: dto.name, status: dto.status,parkingId: dto.parkingId, },
    });
  }
//  10. Supprimer un location
async deleteLocation(id: number) {
  return this.prisma.location.delete({
    where: { id },
  });
}

}
