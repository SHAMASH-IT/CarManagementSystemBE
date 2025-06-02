import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay } from 'date-fns';
import { Status } from '@prisma/client';
import { StartInterventionDto } from './dto/start-intervention';
import { UpdateInterventionDto } from './dto/update-intervention';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  // 1. Récupérer les rendez-vous de statut RESERVED
  async getReservedAppointments() {
    return this.prisma.appointment.findMany({
      where: { status: Status.RESERVED },
      include: { vehicle: true, service: true },
    });
  }

  // 2. Commencer une intervention à partir d’un rendez-vous
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


  
  
  async getIntervention(id: number) {
    const intervention = await this.prisma.intervention.findUnique({
      where: {
        id: id,  // S'assurer que id est un nombre entier
      },
      include: {
        appointment: {
          include: {
            vehicle: true,
            service: true,
          }
        },
        interventionPieces: true,
      }
    });
  
    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }
  
    return intervention;
  }
  

  // 🔁 Mettre à jour une intervention
  async updateIntervention(id: number, dto: UpdateInterventionDto) {
  const intervention = await this.prisma.intervention.findUnique({
    where: { id },
    include: { interventionPieces: true },
  });

  if (!intervention) {
    throw new NotFoundException('Intervention not found');
  }

  // Anciennes pièces et quantités
  const oldPieces = intervention.interventionPieces;
  const oldPiecesMap = new Map<number, number>();
  oldPieces.forEach(p => oldPiecesMap.set(p.pieceId, p.quantity));

  // Nouvelles pièces et quantités
  const newPiecesMap = new Map<number, number>();
  if (dto.pieces && dto.pieces.length > 0) {
    dto.pieces.forEach(p => newPiecesMap.set(p.id, p.quantity));
  }

  // 1. Calculer le stock disponible *après* remise en stock des anciennes pièces
  // Récupérer toutes les pièces impliquées (anciennes + nouvelles)
  const allPieceIds = new Set<number>([
    ...Array.from(oldPiecesMap.keys()),
    ...Array.from(newPiecesMap.keys()),
  ]);

  // Charger les pièces en BDD
  const piecesInDb = await this.prisma.piece.findMany({
    where: { id: { in: Array.from(allPieceIds) } },
  });

  // Construire un map id -> stock
  const pieceStockMap = new Map<number, number>();
  piecesInDb.forEach(p => pieceStockMap.set(p.id, p.stock));

  // 2. Simuler le stock après remise en stock des anciennes pièces
  // On ajoute d'abord les quantités des anciennes pièces
  for (const [pieceId, oldQty] of oldPiecesMap.entries()) {
    pieceStockMap.set(pieceId, (pieceStockMap.get(pieceId) ?? 0) + oldQty);
  }

  // 3. Vérifier si les nouvelles quantités sont disponibles
  for (const [pieceId, newQty] of newPiecesMap.entries()) {
    const availableStock = pieceStockMap.get(pieceId) ?? 0;
    if (newQty > availableStock) {
      const pieceName = piecesInDb.find(p => p.id === pieceId)?.name ?? 'Unknown piece';
      throw new BadRequestException(
        `Not enough stock for piece "${pieceName}". Requested: ${newQty}, Available: ${availableStock}`,
      );
    }
    // Déduire la nouvelle quantité du stock simulé
    pieceStockMap.set(pieceId, availableStock - newQty);
  }

  // 4. Tout est ok, on peut procéder à la mise à jour :

  // Mettre à jour les attributs de l'intervention
  const updatedIntervention = await this.prisma.intervention.update({
    where: { id },
    data: {
      description: dto.description ?? intervention.description,
      endDate: dto.endDate ? new Date(dto.endDate) : intervention.endDate,
      price: dto.price ?? intervention.price,
      status: dto.status ?? intervention.status,
    },
  });

  // Supprimer anciennes interventionPieces
  await this.prisma.interventionPiece.deleteMany({
    where: { interventionId: updatedIntervention.id },
  });

  // Remettre en stock les anciennes pièces
  for (const oldPiece of oldPieces) {
    await this.prisma.piece.update({
      where: { id: oldPiece.pieceId },
      data: { stock: { increment: oldPiece.quantity } },
    });
  }

  // Créer les nouvelles interventionPieces et décrémenter le stock
  if (dto.pieces && dto.pieces.length > 0) {
    for (const piece of dto.pieces) {
      await this.prisma.interventionPiece.create({
        data: {
          pieceId: piece.id,
          quantity: piece.quantity,
          totalPrice: piece.price * piece.quantity,
          interventionId: updatedIntervention.id,
        },
      });

      await this.prisma.piece.update({
        where: { id: piece.id },
        data: { stock: { decrement: piece.quantity } },
      });
    }
  }

  await this.prisma.notification.create({
    data: {
      message: `Votre intervention a été mise à jour.`,
      type: 'Intervention mise à jour',
      interventionId: intervention.id,
    },
  });

  return updatedIntervention;
}

  
  
  
  async completeIntervention(id: number) {
  const interventionId = Number(id);
  if (isNaN(interventionId)) {
    throw new BadRequestException('ID must be a valid integer');
  }

  const intervention = await this.prisma.intervention.findUnique({
    where: { id: interventionId },
    include: {
      interventionPieces: {
        include: {
          piece: true,
        },
      },
    },
  });

  if (!intervention) {
    throw new NotFoundException('Intervention not found');
  }

  if (intervention.status === Status.COMPLETED) {
    throw new BadRequestException('Intervention is already completed');
  }

  let totalPrice = intervention.price;

  // Suppression de la décrémentation du stock
  for (const interventionPiece of intervention.interventionPieces) {
    const quantity = interventionPiece.quantity ?? 0;

    if (interventionPiece.piece?.id && interventionPiece.piece?.price != null) {
      // Ici, tu peux calculer le prix total si tu le souhaites
      // totalPrice += quantity * interventionPiece.piece.price;
    }
  }

  const updatedIntervention = await this.prisma.intervention.update({
    where: { id: interventionId },
    data: {
      endDate: new Date(),
      status: Status.COMPLETED,
      price: totalPrice,
    },
  });

  if (intervention.appointmentId) {
    await this.prisma.appointment.update({
      where: { id: intervention.appointmentId },
      data: { status: Status.COMPLETED },
    });

    const position = await this.prisma.position.findFirst({
      where: { appointmentId: intervention.appointmentId },
    });

    if (position) {
      await this.prisma.location.update({
        where: { id: position.locationId },
        data: { status: 'EMPTY' },
      });
    }
  }

  const invoice = await this.prisma.invoice.create({
    data: {
      total: totalPrice,
      description: intervention.description,
      interventionId: updatedIntervention.id,
    },
  });

  await this.prisma.notification.create({
    data: {
      message: `Votre intervention est complétée.`,
      type: 'Intervention complétée',
      interventionId: intervention.id,
    },
  });

  return { updatedIntervention, invoice };
}

  
  
  
  /*
  async createInterventionFromOrder(orderId: number, description: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { piece: true },
    });
  
    if (!order) {
      throw new BadRequestException("Commande introuvable.");
    }
  
    // Optionnel : vérifie si une intervention existe déjà pour cette commande
    const existingIntervention = await this.prisma.intervention.findFirst({
      where: { pieceId: order.pieceId, status: Status.PENDING },
    });
  
    if (existingIntervention) {
      throw new BadRequestException("Une intervention est déjà en attente pour cette commande.");
    }
  
    const intervention = await this.prisma.intervention.create({
      data: {
        description,
        startDate: new Date(),
        endDate: new Date(), // Tu peux le laisser vide ou le mettre à null si tu préfères
        price: order.piece.price * order.quantity,
        status: Status.PENDING,
        pieceId: order.pieceId,
         
      },
    });
  
    return intervention;
  }
  async completeInterventionFromOrder(orderId: number) {
    // Récupérer la commande
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { piece: true },
    });
  
    if (!order) {
      throw new BadRequestException("Commande introuvable.");
    }
  
    // Récupérer l'intervention en cours pour cette commande
    const intervention = await this.prisma.intervention.findFirst({
      where: { pieceId: order.pieceId, status: Status.PENDING },
    });
  
    if (!intervention) {
      throw new BadRequestException("Aucune intervention en attente pour cette commande.");
    }
  
    // Mettre à jour l'intervention pour la marquer comme complétée
    const completedIntervention = await this.prisma.intervention.update({
      where: { id: intervention.id },
      data: {
        status: Status.COMPLETED,
        endDate: new Date(),  // Mettre la date de fin à la date actuelle
      },
    });
  
    // Créer une facture pour l'intervention terminée
    const invoice = await this.prisma.invoice.create({
      data: {
        total: completedIntervention.price,  // Utilise le prix de l'intervention
        description: 'Facture pour intervention terminée',  // Description
          // Tu peux ajuster selon le statut
        interventionId: completedIntervention.id,  // Référence à l'intervention
      },
    });
  
    // Mettre à jour le statut de la commande à "COMPLETED"
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
      },
    });
  
    return {
      intervention: completedIntervention,
      invoice: invoice,
      order: updatedOrder,
    };
  }*/
  async getInProgressInterventions() {
    const interventions = await this.prisma.intervention.findMany({
      where: { status: Status.IN_PROGRESS },
      include: {
        appointment: {
          include: {
            vehicle: true,
            service: true,
          },
        },
        interventionPieces: {
          include: {
            piece: true,
          },
        },
      },
    });
  
   
  
    return interventions;
  }
  async getReservedAppointmentsByServiceId(serviceId: number) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: Status.RESERVED,
        serviceId: serviceId,
      },
      include: {
        vehicle: true,
        service: true,
      },
    });
  
    if (appointments.length === 0) {
      throw new NotFoundException(`Aucun rendez-vous réservé pour le service ${serviceId}`);
    }
  
    return appointments;
  }
  async getCompletedInterventions() {
    const interventions = await this.prisma.intervention.findMany({
      where: { status: Status.COMPLETED },
      include: {
        appointment: {
          include: {
            vehicle: true,
            service: true,
          },
        },
        interventionPieces: {
          include: {
            piece: true,
          },
        },
      },
    });
  
    return interventions;
  } 
  async getInProgressInterventionsByServiceId(serviceId: number) {
    const interventions = await this.prisma.intervention.findMany({
      where: {
        status: Status.IN_PROGRESS,
        appointment: {
          serviceId: serviceId,
        },
      },
      include: {
        appointment: {
          include: {
            vehicle: true,
            service: true,
          },
        },
        interventionPieces: {
          include: {
            piece: true,
          },
        },
      },
    });
  
    
  
    return interventions;
  }
  async getInProgressInterventionsByCarId(carId: number) {
    const interventions = await this.prisma.intervention.findMany({
      where: {
        status: Status.IN_PROGRESS,
        appointment: {
          vehicleId: carId,
        },
      },
      include: {
        appointment: {
          include: {
            vehicle: true,
            service: true,
          },
        },
        interventionPieces: {
          include: {
            piece: true,
          },
        },
      },
    });
  
   
  
    return interventions;
  }
  async getReservedAppointmentsToday(todayOnly = false) {
    const today = new Date();
  
    return this.prisma.appointment.findMany({
      where: {
        status: Status.RESERVED,
        ...(todayOnly && {
          date: {
            gte: startOfDay(today),
            lte: endOfDay(today),
          },
        }),
      },
      include: { vehicle: true, service: true },
    });
  }
  // ✅ Récupérer une facture par son ID
async getInvoiceById(id: number) {
  const invoice = await this.prisma.invoice.findUnique({
    where: { id },
    include: {
      intervention: {
        include: {
          appointment: {
            include: {
              vehicle: true,
              service: true,
            },
          },
          interventionPieces: {
            include: {
              piece: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundException(`Invoice with ID ${id} not found.`);
  }

  return invoice;
}

// ❌ Supprimer une facture
async deleteInvoice(id: number) {
  const invoice = await this.prisma.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    throw new NotFoundException(`Invoice with ID ${id} not found.`);
  }

  return this.prisma.invoice.delete({
    where: { id },
  });
}
async rateIntervention(interventionId: number, data: { rate?: number; commentaire?: string }) {
  const intervention = await this.prisma.intervention.findUnique({
    where: { id: interventionId },
  });

  if (!intervention) {
    throw new NotFoundException("Intervention introuvable.");
  }

  // ✅ Vérifie que l'intervention est terminée
  if (intervention.status !== 'COMPLETED') {
    throw new BadRequestException("Vous ne pouvez évaluer que les interventions terminées.");
  }

  // ✅ Vérifie la validité de la note
  if (data.rate !== undefined && (data.rate < 1 || data.rate > 5)) {
    throw new BadRequestException("La note doit être entre 1 et 5.");
  }

  const updateData: any = {};
  if (data.rate !== undefined) updateData.rate = data.rate;
  if (data.commentaire !== undefined) updateData.commentaire = data.commentaire;

  return this.prisma.intervention.update({
    where: { id: interventionId },
    data: updateData,
  });
}

 async getClientAndProviderFromAppointment(appointmentId: number) {
    return await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        vehicle: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                matf: true,
              },
            },
          },
        },
        service: {
          select: {
            provider: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }
async getClientAndProviderFromIntervention(interventionId: number) {
    return await this.prisma.intervention.findUnique({
      where: { id: interventionId },
      select: {
        appointment: {
          select: {
            vehicle: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                     matf: true,
                  },
                },
              },
            },
            service: {
              select: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

 async getInterventions(userId: number) {
  // Récupérer l'utilisateur avec son rôle
  const user = await this.prisma.user.findUnique({
    where: { id: Number(userId) },  // Correction ici
    select: { role: true },
  });

  if (!user) {
    throw new NotFoundException('Utilisateur non trouvé');
  }

  // Si l'utilisateur est admin, retourner toutes les interventions
  if (user.role === 'ADMIN') {
    return await this.prisma.intervention.findMany({
      include: {
        appointment: {
          include: { service: true },
        },
      },
    });
  }

  // Si l'utilisateur est provider, retourner les interventions de ses services
  if (user.role === 'PROVIDER') {
    return await this.prisma.intervention.findMany({
      where: {
        appointment: {
          service: {
            providerId: Number(userId),  // Correction ici aussi
          },
        },
      },
      include: {
        appointment: {
          include: { service: true },
        },
      },
    });
  }

  
}

async getCompleted(userId: number) {
  // Vérifier si l'utilisateur existe et est un client
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });


  // Récupérer les interventions complétées liées aux véhicules de ce client
  const interventions = await this.prisma.intervention.findMany({
    where: {
      status: Status.COMPLETED,
      appointment: {
        vehicle: {
          userId: userId,
        },
      },
    },
    include: {
      appointment: {
        include: {
          vehicle: true,
          service: true,
        },
      },
      interventionPieces: {
        include: {
          piece: true,
        },
      },
    },
  });

  return interventions;
}

async getCompletedInterventionsWithInvoiceByUser(userId: number): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
  
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }
  
    let interventions;
  
    if (user.role === 'PROVIDER') {
      const services = await this.prisma.service.findMany({
        where: { providerId: userId },
        select: { id: true },
      });
  
      const serviceIds = services.map(service => service.id);
  
      interventions = await this.prisma.intervention.findMany({
        where: {
          status: 'COMPLETED',
          appointment: {
            serviceId: { in: serviceIds },
          },
        },
        include: {
          appointment: {
            include: {
              service: true,
              vehicle: true,
            },
          },
          Invoice: true,
          interventionPieces: {
            include: {
              piece: true,
            },
          },
        },
      });
    } else if (user.role === 'ADMIN') {
      interventions = await this.prisma.intervention.findMany({
        where: {
          status: 'COMPLETED',
        },
        include: {
          appointment: {
            include: {
              service: true,
              vehicle: true,
            },
          },
          Invoice: true,
          interventionPieces: {
            include: {
              piece: true,
            },
          },
        },
      });
    } else {
      throw new Error('Accès non autorisé');
    }
  
    // Optionnel : transformation claire des données
    return interventions.map((intervention) => ({
      id: intervention.id,
      description: intervention.description,
      startDate: intervention.startDate,
      endDate: intervention.endDate,
      price: intervention.price,
      status: intervention.status,
      rate: intervention.rate,
      commentaire: intervention.commentaire,
      appointment: intervention.appointment,
      invoice: intervention.Invoice,
      pieces: intervention.interventionPieces.map((ip) => ({
        id: ip.piece.id,
        name: ip.piece.name,
        quantity: ip.quantity,
        unitPrice: ip.piece.price,
        totalPrice: ip.totalPrice,
      })),
    }));
  }

}
