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

  // ✅ 6. Trouver les locations disponibles pour un rendez-vous donné
  async getAvailableLocations(serviceId: number, appointmentDate: Date, appointmentTime: Date) {
    const parkings = await this.prisma.parking.findMany({
      where: { serviceId },
      include: {
        locations: {
          include: {
            positions: {
              include: {
                vehicle: {
                  include: { appointments: true }, // Récupérer les rendez-vous des véhicules garés
                },
              },
            },
          },
        },
      },
    });

    // Filtrer les locations disponibles
    const availableLocations = parkings
      .flatMap((parking) => parking.locations) // Extraire toutes les locations des parkings
      .filter((location) => {
        // Vérifier que la location est en statut PENDING
        if (location.status !== Status.PENDING) return false;

        // Vérifier si elle est occupée à la date et heure du rendez-vous
        const isOccupied = location.positions.some((position) => {
          const vehicleAppointments = position.vehicle?.appointments || [];
          return vehicleAppointments.some((appointment) => {
            return (
              appointment.date.toISOString().split("T")[0] === appointmentDate.toISOString().split("T")[0] &&
              appointment.time.toISOString().split("T")[1] === appointmentTime.toISOString().split("T")[1]
            );
          });
        });

        return !isOccupied; // Retourner seulement les locations libres
      });

    return availableLocations;
  }
}
