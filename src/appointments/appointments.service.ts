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

  if (!vehicle) throw new NotFoundException('Vehicle not found!');
  if (!service) throw new NotFoundException('Service not found!');

  const appointmentDate = new Date(`${dto.date}T${dto.time}:00`);
  const appointmentDatePlus1h = new Date(appointmentDate);
  appointmentDatePlus1h.setHours(appointmentDatePlus1h.getHours() + 1);

  const now = new Date();
if (appointmentDatePlus1h <= now) {
  throw new ConflictException('Impossible de prendre un rendez-vous dans le passé.');
}
  // Vérifier si le véhicule a déjà un rendez-vous ce jour-là
  const existingAppointment = await this.prisma.appointment.findFirst({
    where: {
      vehicleId: vehicle.id,
      status: { in: ['RESERVED', 'IN_PROGRESS', 'PENDING'] },
      date: {
        gte: new Date(`${dto.date}T00:00:00`),
        lte: new Date(`${dto.date}T23:59:59`),
      },
    },
  });

  if (existingAppointment) {
    throw new ConflictException('Ce véhicule a déjà un rendez-vous actif ce jour-là.');
  }

  // Récupérer toutes les locations du service
  const serviceParkings = await this.prisma.parking.findMany({
    where: { serviceId: dto.serviceId },
    include: { locations: true },
  });
  const allLocations = serviceParkings.flatMap(p => p.locations);

  // Récupérer toutes les locations déjà utilisées à ce créneau précis
  const conflictingPositions = await this.prisma.position.findMany({
    where: {
      appointment: {
        date: appointmentDatePlus1h,
        time: appointmentDatePlus1h, // facultatif si identique à date
        serviceId: dto.serviceId,
        status: { not: 'CANCELLED' },
      },
    },
    select: { locationId: true },
  });

  const usedLocationIds = conflictingPositions.map(p => p.locationId);
  const availableLocation = allLocations.find(
    loc => !usedLocationIds.includes(loc.id)
  );

  if (!availableLocation) {
    throw new ConflictException('Aucune location disponible pour ce créneau.');
  }

  // Créer le rendez-vous
  const appointment = await this.prisma.appointment.create({
    data: {
      date: appointmentDatePlus1h,
      time: appointmentDatePlus1h,
      vehicleId: vehicle.id,
      serviceId: service.id,
      status: 'PENDING',
    },
  });

  // Lier le rendez-vous à la location libre
  await this.prisma.position.create({
    data: {
      appointmentId: appointment.id,
      vehicleId: vehicle.id,
      locationId: availableLocation.id,
    },
  });

  // Notification
  await this.prisma.notification.create({
    data: {
      message: `Votre rendez-vous a été confirmé pour le ${dto.date} à ${dto.time}`,
      type: 'Appointment Created',
      appointmentId: appointment.id,
    },
  });

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

  const positionToDelete = appointment.vehicle.positions.find(
    (p) => p.appointmentId === appointmentId
  );

  await this.prisma.notification.create({
    data: {
      message: `Votre rendez-vous est annulé.`,
      type: 'Appointment Annuler',
      appointmentId: appointment.id,
    },
  });

  return this.prisma.$transaction([
    this.prisma.position.deleteMany({
      where: { appointmentId },
    }),
    this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
    }),
  ]);
}

     async updateAppointmentDateTime(appointmentId: number, dto: updateAppointment) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      vehicle: { include: { positions: true } },
      service: true,
    },
  });

  if (!appointment) throw new NotFoundException('Appointment not found!');
  if (!dto.date) throw new BadRequestException('Nouvelle date non fournie');

  const vehicle = appointment.vehicle;
  const service = appointment.service;
  const appointmentDateTime = new Date(dto.date);

  if (isNaN(appointmentDateTime.getTime())) {
    throw new BadRequestException('Date invalide');
  }

  // Vérifier si un autre RDV est déjà prévu pour ce véhicule à cette date/heure (hors lui-même)
  const conflictingVehicleAppointment = await this.prisma.appointment.findFirst({
    where: {
      vehicleId: vehicle.id,
      date: appointmentDateTime,
      id: { not: appointmentId },
    },
  });

  if (conflictingVehicleAppointment) {
    throw new ConflictException('This vehicle already has an appointment at this time.');
  }

  // Vérifier combien de RDV existent déjà pour ce service à ce moment
  const sameTimeAppointments = await this.prisma.appointment.findMany({
    where: {
      serviceId: service.id,
      date: appointmentDateTime,
      status: { not: 'CANCELLED' },
    },
  });

  const serviceParkings = await this.prisma.parking.findMany({
    where: { serviceId: service.id },
    include: { locations: true },
  });

  const allLocations = serviceParkings.flatMap(p => p.locations);
  const totalAvailable = allLocations.length;

  if (sameTimeAppointments.length >= totalAvailable) {
    throw new ConflictException('No available parking locations at this time.');
  }

  const usedLocationIds = await this.prisma.position.findMany({
    where: {
      appointmentId: { in: sameTimeAppointments.map(a => a.id) },
    },
    select: { locationId: true },
  });

  const usedIds = usedLocationIds.map(p => p.locationId);
  const freeLocation = allLocations.find(loc => !usedIds.includes(loc.id));

  if (!freeLocation) {
    throw new ConflictException('No free parking location found at the selected time.');
  }

  return this.prisma.$transaction([
    this.prisma.position.deleteMany({ where: { appointmentId } }),
    this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: appointmentDateTime,
        time: appointmentDateTime,
        status: 'PENDING',
      },
    }),
    this.prisma.position.create({
      data: {
        vehicleId: vehicle.id,
        locationId: freeLocation.id,
        appointmentId: appointmentId,
      },
    }),
    this.prisma.notification.create({
      data: {
        message: `Votre rendez-vous a été mis à jour au ${appointmentDateTime.toLocaleString()}.`,
        type: 'Appointment Updated',
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
                        user:{
                            select:{
                                name:true,
                                phone:true,
                            },
                        },
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
async getAppointmentsByUserId(userId: number) {
  return this.prisma.appointment.findMany({
    where: {
      status: {
        not: 'CANCELLED',
      },
      vehicle: {
        userId: userId,
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
    async getAppointmentsByServiceId(serviceId: number) {
        return this.prisma.appointment.findMany({
          where: {
            serviceId,
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
      async confirmAppointment(appointmentId: number) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
        });
    
        if (!appointment) {
            throw new NotFoundException('Appointment not found!');
        }
    
        if (appointment.status !== 'PENDING') {
            throw new BadRequestException(`Only appointments with status 'PENDING' can be confirmed.`);
        }
    await this.prisma.notification.create({
        data: {
            message: `Votre rendez-vous est accepter`,
            type: 'Appointment accepter',
            appointmentId: appointment.id,
        },
    });
        return this.prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: 'RESERVED',
            },
        });
    }
    async getPendingAppointments() {
        return this.prisma.appointment.findMany({
            where: {
                status: 'PENDING',
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
    async getReservedAppointments() {
        return this.prisma.appointment.findMany({
            where: {
                status: 'RESERVED',
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
    async getAppointmentsByUserRole(userId: number) {
    // Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec ID ${userId} introuvable.`);
    }

    // Si l'utilisateur est ADMIN, retourner tous les rendez-vous
    if (user.role === 'ADMIN') {
      return this.prisma.appointment.findMany({
        include: {
          vehicle: true,
          service: true,
        },
      });
    }

    // Si l'utilisateur est PROVIDER, récupérer ses services et les rendez-vous associés
    if (user.role === 'PROVIDER') {
      const services = await this.prisma.service.findMany({
        where: { providerId: userId },
        select: { id: true },
      });

      const serviceIds = services.map((service) => service.id);

      return this.prisma.appointment.findMany({
        where: { serviceId: { in: serviceIds } },
        include: {
          vehicle: true,
          service: true,
        },
      });
    }

    
    
  }    
  async getTodayAppointments(userId: number) {
  // Récupérer l'utilisateur avec son rôle
  const user = await this.prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { role: true },
  });

  if (!user) {
    throw new NotFoundException('Utilisateur non trouvé');
  }

  // Obtenir la date du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Début de la journée
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Début du lendemain

  // Si l'utilisateur est admin, retourner tous les rendez-vous d'aujourd'hui avec statut RESERVED
  if (user.role === 'ADMIN') {
    return await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: 'RESERVED',
      },
      include: {
        service: true,
        vehicle: true,
      },
    });
  }

  // Si l'utilisateur est provider, retourner les rendez-vous de ses services pour aujourd'hui avec statut RESERVED
  if (user.role === 'PROVIDER') {
    const services = await this.prisma.service.findMany({
      where: { providerId: Number(userId) },
      select: { id: true },
    });

    const serviceIds = services.map((service) => service.id);

    return await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        serviceId: { in: serviceIds },
        status: 'RESERVED',
      },
      include: {
        service: true,
        vehicle: true,
      },
    });
  }

  // Optionnel : pour les autres rôles, on retourne une liste vide ou une exception
  return [];
}



/* async 

async updateAppointmentDateTime(appointmentId: number, dto: updateAppointment) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      vehicle: {
        include: {
          positions: true,
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

  const updatedDate = dto.date ?? appointment.date.toISOString().split('T')[0];
  const updatedTime = dto.time ?? appointment.time.toISOString().split('T')[1].slice(0, 5);

  const appointmentDateTime = new Date(`${updatedDate}T${updatedTime}:00`);

  // ✅ Vérifier si un autre RDV est déjà prévu pour ce véhicule à ce moment
  const existingAppointment = await this.prisma.appointment.findFirst({
    where: {
      vehicleId: vehicle.id,
      date: appointmentDateTime,
      id: { not: appointmentId }, // Ignorer le rendez-vous actuel
    },
  });

  if (existingAppointment) {
    throw new ConflictException('This vehicle already has an appointment at this time.');
  }

  // ✅ Vérifier le nombre total de rendez-vous à ce moment pour ce service
  const sameTimeAppointments = await this.prisma.appointment.findMany({
    where: {
      serviceId: service.id,
      date: appointmentDateTime,
      status: { not: 'CANCELLED' },
    },
  });

  const availableLocations = await this.parkingService.getLocationsByServiceId(service.id);
  const totalAvailable = availableLocations.length;

  if (sameTimeAppointments.length >= totalAvailable) {
    throw new ConflictException('No available parking locations at this time for the selected service.');
  }

  // ✅ Récupérer toutes les `positions` à ce moment pour ce service
  const usedLocationIds = await this.prisma.position.findMany({
    where: {
      appointmentId: {
        in: sameTimeAppointments.map((a) => a.id),
      },
    },
    select: { locationId: true },
  });

  const usedIds = usedLocationIds.map((pos) => pos.locationId);
  const freeLocation = availableLocations.find(loc => !usedIds.includes(loc.id));

  if (!freeLocation) {
    throw new ConflictException('No free parking location found at the selected time.');
  }

  return this.prisma.$transaction([
    // Supprimer ancienne position
    this.prisma.position.deleteMany({
      where: { appointmentId },
    }),
    // Mettre à jour le rendez-vous
    this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: appointmentDateTime,
        time: appointmentDateTime,
        status: 'PENDING',
      },
    }),
    // Créer la nouvelle position
    this.prisma.position.create({
      data: {
        vehicleId: vehicle.id,
        locationId: freeLocation.id,
        appointmentId: appointmentId,
      },
    }),
    // Envoyer une notification
    this.prisma.notification.create({
      data: {
        message: `Votre rendez-vous a été mis à jour au ${updatedDate} à ${updatedTime}.`,
        type: 'Appointment Updated',
        appointmentId: appointmentId,
      },
    }),
  ]);
}

*/
}    


    
    