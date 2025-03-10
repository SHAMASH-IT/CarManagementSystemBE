import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Createappointment } from './dto';
import { ParkingService } from 'src/parking/parking.service';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService,
                private parkingService: ParkingService) {}
        // create appointment
    async createAppointment(dto: Createappointment) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: dto.vehicleId },
        });

        const service = await this.prisma.service.findUnique({
            where: { id: dto.serviceId },
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found!');
        }
        if (!service) {
            throw new NotFoundException('Service not found!');
        }

        const appointmentDateTime = new Date(`${dto.date}T${dto.time}:00`);

        const existingAppointment = await this.prisma.appointment.findFirst({
            where: {
                vehicleId: vehicle.id,
                date: appointmentDateTime,
            },
        });

        if (existingAppointment) {
            throw new ConflictException('An appointment is already scheduled for this vehicle at this time!');
        }

        const availableLocations = await this.parkingService.getEmptyLocationsByServiceId(service.id);

        if (availableLocations.length === 0) {
            throw new ConflictException('No available locations for the selected service at this time!');
        }

        const selectedLocation = availableLocations[0];

        const [appointment] = await this.prisma.$transaction([
            this.prisma.appointment.create({
                data: {
                    date:dto.date,
                    time:dto.time,
                    vehicleId: vehicle.id,
                    serviceId: service.id,
                },
            }),
            this.prisma.location.update({
                where: { id: selectedLocation.id },
                    data: { status: 'OCCUPIED' },
                }),
                this.prisma.position.create({
                    data: {
                        vehicleId: vehicle.id,
                        locationId: selectedLocation.id,
                    },
                }),
        ]);

        return appointment;
    }
    // all appointments
    async getAllAppointments() {
        return this.prisma.appointment.findMany({
            include: {
                vehicle: {
                    select: {
                        brand: true,
                        model: true,
                        year: true,
                        registration: true,
                        positions: {
                            select: {
                                location: {
                                    select: {
                                        name: true, 
                                    },
                                },
                            },
                        },
                    },
                },
                service: true,
            },
        });
    }

    //  all appointments for a specific vehicle
    async getAppointmentsOfOneCar(vehicleId: number) {
        return this.prisma.appointment.findMany({
            where: { vehicleId },
            include: {
                vehicle: {
                    select: {
                        brand: true,
                        model: true,
                        year: true,
                        registration: true,
                        positions: {
                            select: {
                                location: {
                                    select: {
                                        name: true, 
                                    },
                                },
                            },
                        },
                    },
                },
                service: true,
            },
        });
    }

    // all appointments for a specific date 
    async getAppointmentsByDate(date: string) {
        return this.prisma.appointment.findMany({
            where: {
                date: new Date(date),
            },
            include: {
                vehicle: {
                    select: {
                        brand: true,
                        model: true,
                        year: true,
                        registration: true,
                        positions: {
                            select: {
                                location: {
                                    select: {
                                        name: true, 
                                    },
                                },
                            },
                        },
                    },
                },
                service: true,
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