import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  async startIntervention(appointmentId: number, dto: StartInterventionDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== Status.RESERVED) {
      throw new BadRequestException('This appointment is not in a RESERVED state');
    }

    // Créer l’intervention
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

    // Mettre à jour le statut du rendez-vous si besoin (facultatif)
    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: Status.IN_PROGRESS },
    });

    return intervention;
  }
  async getIntervention(id: number) {
    const intervention = await this.prisma.intervention.findUnique({
      where: { id },
      include: {
        appointment: {
          include: { vehicle: true, service: true }
        },
        piece: true
      },
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
    });

    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }

    return this.prisma.intervention.update({
      where: { id },
      data: {
        ...dto,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }/*
  async completeIntervention(id: number) {
    const intervention = await this.prisma.intervention.findUnique({
      where: { id },
    });
  
    if (!intervention) {
      throw new NotFoundException('Intervention not found');
    }
  
    if (intervention.status === Status.COMPLETED) {
      throw new BadRequestException('Intervention is already completed');
    }
  
    // 1. Update the intervention
    const updatedIntervention = await this.prisma.intervention.update({
      where: { id },
      data: {
        endDate: new Date(),
        status: Status.COMPLETED,
      },
    });
  
    // 2. Create invoice
    await this.prisma.invoice.create({
      data: {
        total: updatedIntervention.price,
        description: intervention.description, 
        interventionId: updatedIntervention.id,
      },
    });
  
    return updatedIntervention;
  }
  */
}
