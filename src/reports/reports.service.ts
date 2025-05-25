import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Status } from '@prisma/client';
import * as Sentiment from 'sentiment'; 
import nlp from 'compromise';
import axios from 'axios';
import { startOfDay, endOfDay, subDays, subYears } from 'date-fns';
import * as tf from '@tensorflow/tfjs';
interface OpenAIResponse {
  choices: {
    message: any; text: string 
}[];
}
@Injectable()
export class ReportsService {constructor(private prisma: PrismaService) {}
 private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';  // Remplace par ton URL API
  private readonly apiKey = process.env.AI_API_KEY; 
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
async countClients(): Promise<number> {
  return await this.prisma.user.count({
    where: {
      role: 'CLIENT',
    },
  });
}
async countVisibleVehicles(): Promise<number> {
  return await this.prisma.vehicle.count({
    where: {
      statut: 'VISIBLE',
    },
  });
}
 private sentiment = new Sentiment();
private analyzeSentiment(comment: string): string {
  const result = this.sentiment.analyze(comment);
  if (result.score > 0) return 'Positive';
  if (result.score < 0) return 'Negative';
  return 'Neutral';
}

// Fonction pour récupérer les commentaires et analyser les sentiments
async getCommentsAndAnalyzeSentiment() {
  const interventions = await this.prisma.intervention.findMany({
    include: {
      appointment: {
        select: {
          service: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const commentsByService: Record<string, { comments: string[], sentiments: string[] }> = {};

  interventions.forEach((intervention) => {
    const serviceName = intervention.appointment?.service?.name || 'Unknown';
    if (!commentsByService[serviceName]) {
      commentsByService[serviceName] = { comments: [], sentiments: [] };
    }

    if (intervention.commentaire) {
      // Ajouter le commentaire
      commentsByService[serviceName].comments.push(intervention.commentaire);
      
      // Analyser le sentiment du commentaire
      const sentiment = this.analyzeSentiment(intervention.commentaire);
      commentsByService[serviceName].sentiments.push(sentiment);
    }
  });

  return commentsByService;
}

// Fonction pour générer un résumé complet par service avec statistiques sur les sentiments
async generateSentimentAnalysis() {
  const commentsByService = await this.getCommentsAndAnalyzeSentiment();
  const analysis: Record<string, any> = {};

  for (const [serviceName, data] of Object.entries(commentsByService)) {
    const sentiments = data.sentiments;
    const stats = {
      positive: sentiments.filter(s => s === 'Positive').length,
      negative: sentiments.filter(s => s === 'Negative').length,
      neutral: sentiments.filter(s => s === 'Neutral').length,
      total: data.comments.length,
    };

    analysis[serviceName] = { stats, comments: data.comments };
  }

  return analysis;
}
async getTotalInvoicesAmountByService(serviceId: number): Promise<number> {
  const result = await this.prisma.invoice.aggregate({
    _sum: { total: true },
    where: {
      intervention: { appointment: { serviceId: serviceId } },
    },
  });
  return result._sum.total || 0;
}
 async getTotalInvoicesAmount(): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      _sum: { total: true },
    });
    return result._sum.total || 0;
  }

  // Calculer le montant total des factures sur une période donnée (en jours)
 async getInvoicesAmountByPeriod(days: number): Promise<number> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const result = await this.prisma.invoice.aggregate({
    _sum: { total: true },
    where: { createdAt: { gte: dateThreshold } },
  });
  return result._sum.total || 0;
}

async getLast28DaysInvoicesAmount(): Promise<number> {
  return await this.getInvoicesAmountByPeriod(28);
}

async getLast70DaysInvoicesAmount(): Promise<number> {
  return await this.getInvoicesAmountByPeriod(70);
}

async getLast90DaysInvoicesAmount(): Promise<number> {
  return await this.getInvoicesAmountByPeriod(90);
}

async getYearInvoicesAmount(): Promise<number> {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const result = await this.prisma.invoice.aggregate({
    _sum: { total: true },
    where: { createdAt: { gte: startOfYear } },
  });
  return result._sum.total || 0;
}

  async getInvoicesAmountByServiceAndPeriod(serviceId: number, days: number): Promise<number> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const result = await this.prisma.invoice.aggregate({
    _sum: { total: true },
    where: {
      createdAt: { gte: dateThreshold },
      intervention: { appointment: { serviceId: serviceId } },
    },
  });
  return result._sum.total || 0;
}

async getLast28DaysInvoicesByService(serviceId: number): Promise<number> {
  return this.getInvoicesAmountByServiceAndPeriod(serviceId, 28);
}

async getLast70DaysInvoicesByService(serviceId: number): Promise<number> {
  return this.getInvoicesAmountByServiceAndPeriod(serviceId, 70);
}

async getLast90DaysInvoicesByService(serviceId: number): Promise<number> {
  return this.getInvoicesAmountByServiceAndPeriod(serviceId, 90);
}

async getYearInvoicesByService(serviceId: number): Promise<number> {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const result = await this.prisma.invoice.aggregate({
    _sum: { total: true },
    where: {
      createdAt: { gte: startOfYear },
      intervention: { appointment: { serviceId: serviceId } },
    },
  });
  return result._sum.total || 0;
}

  async predictFutureRevenue(): Promise<{ message: string; predictions: number[] }> {
  // 1. Récupérer le chiffre d'affaires total du mois en cours
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const invoices = await this.prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: new Date(currentYear, currentMonth - 1, 1),  // Début du mois
        lt: new Date(currentYear, currentMonth, 1),       // Début du mois suivant
      },
    },
  });

  // 2. Vérifier si des données sont disponibles
  if (invoices.length === 0) {
    return { message: "Aucune donnée disponible pour ce mois", predictions: [] };
  }

  // 3. Calcul du chiffre d'affaires total du mois en cours
  const totalCurrentMonth = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

  // 4. Générer les prédictions pour les 6 prochains mois avec une croissance de 5 % par mois
  const predictions = Array(6).fill(0).map((_, i) => 
    totalCurrentMonth * Math.pow(1.05, i + 1)
  );

  return {
    message: `Prédiction basée sur le chiffre d'affaires du mois actuel (${currentMonth}/${currentYear}) : ${totalCurrentMonth}`,
    predictions,
  };
}


async getAppointmentsByProviderAndDate(
  providerId: number,
  filter: 'today' | 'last28days' | 'last70days' | 'specific',
  specificDate?: Date,
) {
  let startDate: Date;
  let endDate: Date;

  const today = new Date();

  switch (filter) {
    case 'today':
      startDate = startOfDay(today);
      endDate = endOfDay(today);
      break;

    case 'last28days':
      endDate = endOfDay(today);
      startDate = subDays(endDate, 28);
      break;

    case 'last70days':
      endDate = endOfDay(today);
      startDate = subDays(endDate, 70);
      break;

    case 'specific':
      if (!specificDate) {
        throw new Error('specificDate is required for "specific" filter');
      }
      startDate = startOfDay(specificDate);
      endDate = endOfDay(specificDate);
      break;

    default:
      throw new Error('Invalid filter type');
  }

  // Récupérer les rendez-vous des services liés au provider
  const appointments = await this.prisma.appointment.findMany({
    where: {
      service: {
        providerId: providerId,
      },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      service: true,
      vehicle: true,

    },
  });

  return appointments;
}
async getAppointmentsByProviderAndService(providerId: number, serviceId: number) {
  // Vérifier si le provider existe
  const provider = await this.prisma.user.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    throw new NotFoundException(`Provider with id ${providerId} not found`);
  }

  // Vérifier si le service appartient bien à ce provider
  const service = await this.prisma.service.findFirst({
    where: {
      id: serviceId,
      providerId: providerId,
    },
  });

  if (!service) {
    throw new NotFoundException(
      `Service with id ${serviceId} not found for provider ${providerId}`,
    );
  }

  // Récupérer les rendez-vous associés à ce service
  const appointments = await this.prisma.appointment.findMany({
    where: {
      serviceId: serviceId,
    },
    include: {
      service: true,
      vehicle: true,
     
    },
  });

  return appointments;
}
async getAppointmentsByProvider(providerId: number) {
  // Vérifier si le provider existe
  const provider = await this.prisma.user.findUnique({
    where: { id: providerId },
  });

  if (!provider) {
    throw new NotFoundException(`Provider with id ${providerId} not found`);
  }

  // Récupérer les rendez-vous liés aux services du provider
  const appointments = await this.prisma.appointment.findMany({
    where: {
      service: {
        providerId: providerId,
      },
    },
    include: {
      service: true,
      vehicle: true,
 
    },
  });

  return appointments;
}


}

 





