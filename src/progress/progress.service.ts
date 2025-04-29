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
  
    // 🔁 Vérifier s’il existe déjà une intervention liée à ce rendez-vous
    const existingIntervention = await this.prisma.intervention.findFirst({
      where: { appointmentId: appointment.id },
    });
  
    if (existingIntervention) {
      throw new BadRequestException('An intervention is already associated with this appointment');
    }
  
    // 🔁 Vérifier que la quantité de chaque pièce est disponible en stock
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
  
    // 🛠️ Créer l’intervention
    const intervention = await this.prisma.intervention.create({
      data: {
        description: dto.description,
        startDate: new Date(),
        endDate: new Date(dto.endDate),
        price: dto.price,
        status: Status.IN_PROGRESS,
        appointmentId: appointment.id,
      },
    });
  
    // 🔗 Associer les pièces à l’intervention
    if (dto.pieces && dto.pieces.length > 0) {
      const interventionPiecesData = dto.pieces.map(piece => ({
        pieceId: piece.id,
        quantity: piece.quantity,
        totalPrice: piece.price * piece.quantity,
        interventionId: intervention.id,
      }));
  
      await this.prisma.interventionPiece.createMany({
        data: interventionPiecesData,
      });
    }
  
    // 🔄 Mettre à jour le statut du rendez-vous
    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: Status.IN_PROGRESS },
    });
  
    return intervention;
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
      include: {
        interventionPieces: true,
      },
    });
  
    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }
  
    // 1. Vérifier la disponibilité en stock pour chaque pièce si pièces mises à jour
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
            `Not enough stock for piece "${dbPiece.name}". Requested: ${piece.quantity}, Available: ${dbPiece.stock}`
          );
        }
      }
    }
  
    // 2. Mettre à jour les attributs de l'intervention
    const updatedIntervention = await this.prisma.intervention.update({
      where: { id },
      data: {
        description: dto.description ?? intervention.description,
        endDate: dto.endDate ? new Date(dto.endDate) : intervention.endDate,
        price: dto.price ?? intervention.price,
        status: dto.status ?? intervention.status,
      },
    });
  
    // 3. Mettre à jour les pièces associées
    if (dto.pieces && dto.pieces.length > 0) {
      await this.prisma.interventionPiece.deleteMany({
        where: { interventionId: updatedIntervention.id },
      });
  
      const interventionPiecesData = dto.pieces.map(piece => ({
        pieceId: piece.id,
        quantity: piece.quantity,
        totalPrice: piece.price * piece.quantity,
        interventionId: updatedIntervention.id,
      }));
  
      await this.prisma.interventionPiece.createMany({
        data: interventionPiecesData,
      });
    }
  
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
  
    for (const interventionPiece of intervention.interventionPieces) {
      const quantity = interventionPiece.quantity ?? 0;  // Si quantity est null, on le remplace par 0
  
      // Vérification de null pour interventionPiece.piece
      if (interventionPiece.piece?.id && interventionPiece.piece?.price != null) {
        totalPrice += quantity * interventionPiece.piece.price;
  
        if (quantity > 0) {
          await this.prisma.piece.update({
            where: { id: interventionPiece.piece.id },  // Assurez-vous que piece.id n'est pas null
            data: {
              stock: {
                decrement: quantity,  // Réduire le stock
              },
            },
          });
        }
      }
    }
  
    const updatedIntervention = await this.prisma.intervention.update({
      where: { id: interventionId },
      data: {
        endDate: new Date(),
        status: Status.COMPLETED,
        price: totalPrice,  // Mise à jour du prix total
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
  
    return { updatedIntervention, invoice };
  }
  
  
  
  
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
  }
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
  
    if (interventions.length === 0) {
      throw new NotFoundException("Aucune intervention en cours.");
    }
  
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
  
    if (interventions.length === 0) {
      throw new NotFoundException(`Aucune intervention en cours pour le service ${serviceId}`);
    }
  
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
  
    if (interventions.length === 0) {
      throw new NotFoundException(`Aucune intervention en cours pour le véhicule ${carId}`);
    }
  
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



  
}
