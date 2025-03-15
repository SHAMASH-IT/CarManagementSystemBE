import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Createappointment, updateAppointment } from './dto';
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


        // Cancel appointment
        async cancelAppointment(appointmentId: number) {
            const appointment = await this.prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: {
                    vehicle: {
                        select: {
                            positions: {
                                select: {
                                    locationId: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!appointment) {
                throw new NotFoundException('Appointment not found!');
            }

            const locationId = appointment.vehicle.positions[0]?.locationId;

            return this.prisma.$transaction([
                this.prisma.appointment.update({
                    where: { id: appointmentId },
                    data: { status: 'CANCELLED' },
                }),
                ...(locationId ? [
                    this.prisma.location.update({
                        where: { id: locationId },
                        data: { status: 'EMPTY' },
                    })
                ] : [])
            ]);
        }
    
    // Update appointment date and/or time
    async updateAppointmentDateTime(appointmentId: number, dto: updateAppointment) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                vehicle: {
                    include: {
                        positions: {
                            include: { location: true },
                        },
                    },
                },
                service: true,
            },
        });
    
        if (!appointment) {
            throw new NotFoundException('Appointment not found!');
        }
    
        const vehicle = appointment.vehicle;
        const service = appointment.service;
        const oldLocationId = vehicle.positions[0]?.location.id;
    
        const updatedData: any = {};
        if (dto.date) updatedData.date = new Date(dto.date);
        if (dto.time) updatedData.time = new Date(`${dto.date || appointment.date.toISOString().split('T')[0]}T${dto.time}:00`);
    
        if (dto.date || dto.time) {
            const appointmentDateTime = updatedData.time || appointment.time;
            const existingAppointment = await this.prisma.appointment.findFirst({
                where: {
                    vehicleId: vehicle.id,
                    date: appointmentDateTime,
                },
            });
    
            if (existingAppointment) {
                throw new ConflictException('An appointment is already scheduled for this vehicle at this time!');
            }
        }
    
        const availableLocations = await this.parkingService.getEmptyLocationsByServiceId(service.id);
        if (availableLocations.length === 0) {
            throw new ConflictException('No available locations for the selected service at this time!');
        }
    
        const newLocation = availableLocations[0];
    
        return this.prisma.$transaction([
            this.prisma.appointment.update({
                where: { id: appointmentId },
                data: updatedData,
            }),
            ...(oldLocationId ? [
                this.prisma.location.update({
                    where: { id: oldLocationId },
                    data: { status: 'EMPTY' },
                })
            ] : []),
            this.prisma.location.update({
                where: { id: newLocation.id },
                data: { status: 'OCCUPIED' },
            }),
            this.prisma.position.create({
                data: {
                    vehicleId: vehicle.id,
                    locationId: newLocation.id,
                },
            }),
        ]);
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


    
}