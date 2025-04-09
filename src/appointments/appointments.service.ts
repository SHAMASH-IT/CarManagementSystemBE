import { Injectable, ConflictException, NotFoundException,BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Createappointment, updateAppointment } from './dto';
import { ParkingService } from 'src/parking/parking.service';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService,
                private parkingService: ParkingService) {}
    async getVehicle(){
        return this.prisma.vehicle.findMany();
    }
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
         // 🚫 Vérifier si ce véhicule a déjà un RDV actif
    const activeAppointment = await this.prisma.appointment.findFirst({
        where: {
            vehicleId: vehicle.id,
            status: {
                in: ['RESERVED', 'IN_PROGRESS'],
            },
        },
    });

    if (activeAppointment) {
        throw new ConflictException(
            'This vehicle already has an active appointment. Please cancel or complete it before scheduling a new one.',
        );
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

        const appointment = await this.prisma.appointment.create({
            data: {
                date: appointmentDateTime,
                time: appointmentDateTime,
                vehicleId: vehicle.id,
                serviceId: service.id,
            },
        });
        
        await this.prisma.$transaction([
            this.prisma.location.update({
                where: { id: selectedLocation.id },
                data: { status: 'OCCUPIED' },
            }),
            this.prisma.position.create({
                data: {
                    vehicleId: vehicle.id,
                    locationId: selectedLocation.id,
                    appointmentId: appointment.id,
                },
            }),
        ]);
        
        return appointment;

    }


        // Cancel appointment
        // Cancel appointment
async cancelAppointment(appointmentId: number) {
    const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
            vehicle: {
                select: {
                    positions: {
                        select: {
                            appointmentId: true,
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

    const locationId = appointment.vehicle.positions.find(
        (p) => p.appointmentId === appointmentId
    )?.locationId;

    return this.prisma.$transaction([
        this.prisma.position.deleteMany({
            where: { appointmentId },
        }),
        this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'CANCELLED' },
        }),
        ...(locationId
            ? [
                  this.prisma.location.update({
                      where: { id: locationId },
                      data: { status: 'EMPTY' },
                  }),
              ]
            : []),
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
        const oldLocationId = appointment.vehicle.positions.find(
            (p) => p.appointmentId === appointmentId
        )?.locationId;
    
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
            
            this.prisma.position.deleteMany({
                where: {
                    appointmentId
                }

            }),
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
                    appointmentId: appointmentId,
                },
            }),
        ]);
    }
   

    async getServices(){
        return this.prisma.service.findMany();
    }
    async getCurrentAppointmentsByClient() {
        return this.prisma.appointment.findMany({
          where: {
            status: 'RESERVED', // Status filter for 'RESERVED' appointments
          },
          include: {
            service: {
              select: {
                name: true, // Include service name
              },
            },
            vehicle: {
              select: {
                brand: true,
                model: true,
                year: true,
                registration: true,
                user: { // Include the vehicle's user (owner) information
                  select: {
                    name: true,
                    phone: true, // Add email or phone if needed
                  },
                },
              },
            },
            positions: {
              select: {
                location: {
                  select: {
                    name: true, // Select location name
                  },
                },
              },
            },
          },
        });
      }
      
    // current appointments by client
    /*async getCurrentAppointmentsByClient(clientId: number) {
        return this.prisma.appointment.findMany({
            where: {
                vehicle: {
                    userId: clientId, 
                },
                status: 'RESERVED',  
            },
            include: {
                service: true,  
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
            },
        });
    }*/
    
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
        // Définir le début et la fin de la journée en UTC
        const startDate = new Date(`${date}T00:00:00.000Z`);
        const endDate = new Date(`${date}T23:59:59.999Z`);
    
        const appointments = await this.prisma.appointment.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
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
    
        return appointments;
    }
}    


    
    