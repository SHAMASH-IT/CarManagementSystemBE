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
         const appointmentDayStart = new Date(dto.date + 'T00:00:00');
         const appointmentDayEnd = new Date(dto.date + 'T23:59:59');
         
         const activeAppointment = await this.prisma.appointment.findFirst({
             where: {
                 vehicleId: vehicle.id,
                 status: {
                     in: ['RESERVED', 'IN_PROGRESS','PENDING'],
                 },
                 date: {
                     gte: appointmentDayStart,
                     lte: appointmentDayEnd,
                 },
             },
         });

    if (activeAppointment) {
      
        throw new ConflictException(
            'This vehicle already has an active appointment. Please cancel or complete it before scheduling a new one.',
        );
    }

    const appointmentDateTime = new Date(`${dto.date}T${dto.time}:00`);
    
    

        

        const availableLocations = await this.parkingService.getEmptyLocationsByServiceId(service.id);

        if (availableLocations.length === 0) {
            throw new ConflictException('No available locations for the selected service at this time!');
        }

        const selectedLocation = availableLocations[0];

        const appointmentDateTimePlusOneHour = new Date(appointmentDateTime);
appointmentDateTimePlusOneHour.setHours(appointmentDateTimePlusOneHour.getHours() + 1);

const appointment = await this.prisma.appointment.create({
    data: {
        date: appointmentDateTime,
        time: appointmentDateTimePlusOneHour,
        vehicleId: vehicle.id,
        serviceId: service.id,
        status: "PENDING"
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
        await this.prisma.notification.create({
        data: {
            message: `Votre rendez-vous est créé pour le ${dto.date} à ${dto.time}.`,
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

    const locationId = appointment.vehicle.positions.find(
        (p) => p.appointmentId === appointmentId
    )?.locationId;
await this.prisma.notification.create({
        data: {
            message: `Votre rendez-vous est Annuler`,
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
  let newDate: Date | null = null;

  // 1. Mise à jour de la date (sans heure)
  if (dto.date) {
    newDate = new Date(dto.date);
    updatedData.date = newDate;
  }

  // 2. Création de la valeur pour time (même jour avec heures/minutes injectés)
  if (dto.time) {
    const baseDate = newDate ?? new Date(appointment.date.toISOString().split('T')[0]);
    const [hours, minutes] = dto.time.split(':').map(Number);
    baseDate.setHours(hours);
    baseDate.setMinutes(minutes || 0);
    baseDate.setSeconds(0);
    baseDate.setMilliseconds(0);
    updatedData.time = baseDate;
  }

  
  // 4. Vérification des emplacements disponibles
  const availableLocations = await this.parkingService.getEmptyLocationsByServiceId(service.id);
  if (availableLocations.length === 0) {
    throw new ConflictException('No available locations for the selected service at this time!');
  }

  const newLocation = availableLocations[0];

  // 5. Mise à jour en transaction
  return this.prisma.$transaction([
    this.prisma.position.deleteMany({
      where: {
        appointmentId,
      },
    }),
    this.prisma.appointment.update({
      where: { id: appointmentId },
      data: updatedData,
    }),
    ...(oldLocationId ? [
      this.prisma.location.update({
        where: { id: oldLocationId },
        data: { status: 'EMPTY' },
      }),
    ] : []),
    this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'PENDING' },
    }),
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

  // Si l'utilisateur est admin, retourner tous les rendez-vous d'aujourd'hui
  if (user.role === 'ADMIN') {
    return await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        service: true,
        vehicle: true,
      },
    });
  }

  // Si l'utilisateur est provider, retourner les rendez-vous de ses services pour aujourd'hui
  if (user.role === 'PROVIDER') {
    // Récupérer les services du provider
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
      },
      include: {
        service: true,
        vehicle: true,
      },
    });
  }

 
}    


/* async createAppointment(dto: Createappointment) {
  const vehicle = await this.prisma.vehicle.findUnique({
    where: { id: dto.vehicleId },
  });

  const service = await this.prisma.service.findUnique({
    where: { id: dto.serviceId },
  });

  if (!vehicle) throw new NotFoundException('Vehicle not found!');
  if (!service) throw new NotFoundException('Service not found!');

  const appointmentDate = new Date(`${dto.date}T${dto.time}:00`);

  // Vérifie s’il y a déjà un rendez-vous actif pour le véhicule ce jour-là
  const appointmentDayStart = new Date(dto.date + 'T00:00:00');
  const appointmentDayEnd = new Date(dto.date + 'T23:59:59');
  
  const activeAppointment = await this.prisma.appointment.findFirst({
    where: {
      vehicleId: vehicle.id,
      status: {
        in: ['RESERVED', 'IN_PROGRESS','PENDING'],
      },
      date: {
        gte: appointmentDayStart,
        lte: appointmentDayEnd,
      },
    },
  });

  if (activeAppointment) {
    throw new ConflictException(
      'This vehicle already has an active appointment. Please cancel or complete it before scheduling a new one.',
    );
  }

  const conflictingAppointments = await this.prisma.appointment.findMany({
    where: {
      serviceId: dto.serviceId,
      date: appointmentDate,
      status: {
        not: 'CANCELLED',
      },
    },
  });

  const serviceParkings = await this.prisma.parking.findMany({
    where: { serviceId: dto.serviceId },
    include: {
      locations: true,
    },
  });

  const allLocations = serviceParkings.flatMap(p => p.locations);
  const totalLocations = allLocations.length;

  if (conflictingAppointments.length >= totalLocations) {
    throw new ConflictException('No available parking locations for this time slot.');
  }

  const usedLocationIds = await this.prisma.position.findMany({
    where: {
      appointment: {
        serviceId: dto.serviceId,
        date: appointmentDate,
        status: {
          not: 'CANCELLED',
        },
      },
    },
    select: { locationId: true },
  });

  const usedIds = usedLocationIds.map(p => p.locationId);
  const availableLocation = allLocations.find(loc => !usedIds.includes(loc.id));

  if (!availableLocation) {
    throw new ConflictException('No available location found for this time.');
  }

  const appointmentDateTimePlusOneHour = new Date(appointmentDateTime);
appointmentDateTimePlusOneHour.setHours(appointmentDateTimePlusOneHour.getHours() + 1);

const appointment = await this.prisma.appointment.create({
    data: {
        date: appointmentDateTime,
        time: appointmentDateTimePlusOneHour,
        vehicleId: vehicle.id,
        serviceId: service.id,
        status: "PENDING"
    },
});

  await this.prisma.position.create({
    data: {
      vehicleId: vehicle.id,
      locationId: availableLocation.id,
      appointmentId: appointment.id,
    },
  });

  await this.prisma.notification.create({
    data: {
      message: `Votre rendez-vous est créé pour le ${dto.date} à ${dto.time}.`,
      type: 'Appointment Created',
      appointmentId: appointment.id,
    },
  });

  return appointment;
}
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
async startIntervention(appointmentId: string, dto: StartInterventionDto) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: Number.parseInt(appointmentId) },
  });

  if (!appointment) {
    throw new NotFoundException('Appointment not found');
  }

  if (appointment.status !== Status.RESERVED) {
    throw new BadRequestException('This appointment is not in a RESERVED state');
  }

  // Vérifier s’il existe déjà une intervention liée à ce rendez-vous
  const existingIntervention = await this.prisma.intervention.findFirst({
    where: { appointmentId: appointment.id },
  });

  if (existingIntervention) {
    throw new BadRequestException('An intervention is already associated with this appointment');
  }

  // Vérifier la disponibilité des pièces
  if (dto.pieces && dto.pieces.length > 0) {
    for (const piece of dto.pieces) {
      const dbPiece = await this.prisma.piece.findUnique({
        where: { id: piece.id },
      });

      if (!dbPiece) {
        throw new NotFoundException(`Piece with id ${piece.id} not found`);
      }

      if (piece.quantity > dbPiece.stock) {
        throw new BadRequestException(
          `Not enough stock for piece "${dbPiece.name}". Requested: ${piece.quantity}, Available: ${dbPiece.stock}`,
        );
      }
    }
  }

  // Récupérer la location liée au rendez-vous via la table position
  const position = await this.prisma.position.findFirst({
    where: { appointmentId: appointment.id },
  });

  // Lancer la transaction
  return this.prisma.$transaction(async (tx) => {
    // Créer l’intervention
    const intervention = await tx.intervention.create({
      data: {
        description: dto.description,
        startDate: new Date(),
        endDate: new Date(dto.endDate),
        price: dto.price,
        status: Status.IN_PROGRESS,
        appointmentId: appointment.id,
      },
    });

    // Associer les pièces
    if (dto.pieces && dto.pieces.length > 0) {
      const interventionPiecesData = dto.pieces.map(piece => ({
        pieceId: piece.id,
        quantity: piece.quantity,
        totalPrice: piece.price * piece.quantity,
        interventionId: intervention.id,
      }));

      await tx.interventionPiece.createMany({
        data: interventionPiecesData,
      });

      for (const piece of dto.pieces) {
        await tx.piece.update({
          where: { id: piece.id },
          data: {
            stock: {
              decrement: piece.quantity,
            },
          },
        });
      }
    }

    // Mettre à jour le statut du rendez-vous
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: Status.IN_PROGRESS },
    });

    // ✅ Mettre à jour la location en OCCUPIED
    if (position?.locationId) {
      await tx.location.update({
        where: { id: position.locationId },
        data: { status: 'OCCUPIED' },
      });
    }

    // Créer une notification
    await tx.notification.create({
      data: {
        message: `Votre intervention est commencée à ${new Date().toLocaleString()}.`,
        type: 'Intervention commence',
        appointmentId: appointment.id,
      },
    });

    return intervention;
  });
}

*/
}    


    
    