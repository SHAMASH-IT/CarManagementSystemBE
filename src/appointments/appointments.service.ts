import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Createappointment } from './dto';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService) {}

    async createAppointment(dto: Createappointment) {
        // Récupérer le véhicule et le service à partir de leurs IDs
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: dto.vehicleId },
        });

        const service = await this.prisma.service.findUnique({
            where: { id: dto.serviceId },
        });

        // Vérifier si le véhicule et le service existent
        if (!vehicle) {
            throw new NotFoundException('Véhicule non trouvé !');
        }
        if (!service) {
            throw new NotFoundException('Service non trouvé !');
        }

        // Convertir la date et l'heure en objet Date
        const appointmentDateTime = new Date(`${dto.date}T${dto.time}:00`);

        // Vérifier si un rendez-vous existe déjà pour ce véhicule à cette heure
        const existingAppointment = await this.prisma.appointment.findFirst({
            where: {
                vehicleId: vehicle.id,
                date: appointmentDateTime,
            },
        });

        if (existingAppointment) {
            throw new ConflictException('Un rendez-vous est déjà programmé pour ce véhicule à cette heure !');
        }

        // Créer le rendez-vous
        return await this.prisma.appointment.create({
            data: {
                date: appointmentDateTime,
                time: appointmentDateTime,
                vehicleId: vehicle.id,
                serviceId: service.id,
            },
        });
    }

    async getAvailableSlots(date: string) {
        const allSlots = [
            "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
        ];

        const takenSlots = await this.prisma.appointment.findMany({
            where: { date: new Date(date) },
            select: { time: true },
        });

        const occupiedTimes = takenSlots.map(app =>
            new Date(app.time).toISOString().substring(11, 16)
        );

        const availableSlots = allSlots.filter(slot => !occupiedTimes.includes(slot));

        return { date, availableSlots };
    }
}