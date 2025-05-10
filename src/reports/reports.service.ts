import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Status } from '@prisma/client';
import { startOfDay, endOfDay, subDays, subYears } from 'date-fns';
@Injectable()
export class ReportsService {constructor(private prisma: PrismaService) {}

  // 1. Get today's appointments
   async getTodayAppointments() {
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { vehicle: true, service: true },
    });

    return {
      appointments
    };
  }

  // 📅 2. Get last 28 days' appointments
  async getLast28DaysAppointments() {
    const endDate = new Date();
    const startDate = subDays(endDate, 28);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { vehicle: true, service: true },
    });

    return {
      startDate,
      endDate,
      appointments,
    };
  }

  // 📅 3. Get last 70 days' appointments
  async getLast70DaysAppointments() {
    const endDate = new Date();
    const startDate = subDays(endDate, 70);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { vehicle: true, service: true },
    });

    return {
      startDate,
      endDate,
      appointments,
    };
  }

  // 📅 4. Get last 90 days' appointments
  async getLast90DaysAppointments() {
    const endDate = new Date();
    const startDate = subDays(endDate, 90);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { vehicle: true, service: true },
    });

    return {
      startDate,
      endDate,
      appointments,
    };
  }

  // 📅 5. Get last year's appointments
  async getLastYearAppointments() {
    const endDate = new Date();
    const startDate = subYears(endDate, 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { vehicle: true, service: true },
    });

    return {
      startDate,
      endDate,
      appointments,
    };
  }
async getProviderAverageRate() {
  // Récupérer toutes les interventions avec les informations nécessaires
  const interventions = await this.prisma.intervention.findMany({
    where: {
      rate: {
        not: null, // Ne récupérer que les interventions avec une note
      },
    },
    select: {
      rate: true,
      appointment: {
        select: {
          service: {
            select: {
              id: true,
              name: true,
              provider: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Regrouper les interventions par service
  const groupedByService = interventions.reduce((acc, intervention) => {
    const appointment = intervention.appointment;

    // Vérifier si l'appointment est non nul
    if (!appointment || !appointment.service) return acc;

    const serviceId = appointment.service.id;

    if (!acc[serviceId]) {
      acc[serviceId] = {
        providerId: appointment.service.provider.id,
        providerName: appointment.service.provider.name,
        serviceId: serviceId,
        serviceName: appointment.service.name,
        rates: [],
      };
    }

    // Ajouter la note à la liste des rates
    if (intervention.rate !== null) {
      acc[serviceId].rates.push(intervention.rate);
    }

    return acc;
  }, {} as Record<number, { providerId: number, providerName: string, serviceId: number, serviceName: string, rates: number[] }>);

  // Calculer la moyenne des notes pour chaque service
  const result = Object.values(groupedByService).map(group => {
    const averageRate = group.rates.length > 0 
      ? group.rates.reduce((sum, rate) => sum + rate, 0) / group.rates.length
      : null;

    return {
      providerId: group.providerId,
      providerName: group.providerName,
      serviceId: group.serviceId,
      serviceName: group.serviceName,
      averageRate: averageRate !== null ? parseFloat(averageRate.toFixed(2)) : 'No rates',
    };
  });

  return result;
}

}





