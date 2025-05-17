import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
@Controller('reports')
export class ReportsController { constructor(private readonly reportsService: ReportsService) {}

  @Get('today')
  getTodayAppointments() {
    return this.reportsService.getTodayAppointments();
  }

  @Get('last-28-days')
  getLast28DaysAppointments() {
    return this.reportsService.getLast28DaysAppointments();
  }

  @Get('last-70-days')
  getLast70DaysAppointments() {
    return this.reportsService.getLast70DaysAppointments();
  }

  @Get('last-90-days')
  getLast90DaysAppointments() {
    return this.reportsService.getLast90DaysAppointments();
  }

  @Get('last-year')
  getLastYearAppointments() {
    return this.reportsService.getLastYearAppointments();
  }
 @Get('average-rates')
  async getProviderAverageRates() {
    return this.reportsService.getProviderAverageRate();
  }
  @Get('clients/count')
  async getClientCount() {
    const count = await this.reportsService.countClients();
    return { totalClients: count };
  }

  @Get('vehicles/visible/count')
  async getVisibleVehicleCount() {
    const count = await this.reportsService.countVisibleVehicles();
    return { totalVisibleVehicles: count };
  }
  @Get('sentiment-analysis') // Accessible via /reports/sentiment-analysis
  async getSentimentAnalysis() {
    try {
      // Appeler la méthode pour générer l'analyse
      const analysis = await this.reportsService.generateSentimentAnalysis();
      return { success: true, data: analysis };
    } catch (error) {
      // En cas d'erreur, on capture l'exception et on retourne une erreur
      return { success: false, message: 'Error generating sentiment analysis', error: error.message };
    }
  }
     @Get('invoices/total')
  async getTotalInvoicesAmount(): Promise<number> {
    return this.reportsService.getTotalInvoicesAmount();
  }

  @Get('invoices/last28days')
  async getLast28DaysInvoicesAmount(): Promise<number> {
    return this.reportsService.getLast28DaysInvoicesAmount();
  }

  @Get('invoices/last70days')
  async getLast70DaysInvoicesAmount(): Promise<number> {
    return this.reportsService.getLast70DaysInvoicesAmount();
  }

  @Get('invoices/last90days')
  async getLast90DaysInvoicesAmount(): Promise<number> {
    return this.reportsService.getLast90DaysInvoicesAmount();
  }

  @Get('invoices/year')
  async getYearInvoicesAmount(): Promise<number> {
    return this.reportsService.getYearInvoicesAmount();
  }

  // Routes pour chaque service
  @Get('invoices/service/:serviceId/total')
  async getTotalInvoicesByService(@Param('serviceId', ParseIntPipe) serviceId: number): Promise<number> {
    return this.reportsService.getTotalInvoicesAmountByService(serviceId);
  }

  @Get('invoices/service/:serviceId/last28days')
  async getLast28DaysInvoicesByService(@Param('serviceId', ParseIntPipe) serviceId: number): Promise<number> {
    return this.reportsService.getLast28DaysInvoicesByService(serviceId);
  }

  @Get('invoices/service/:serviceId/last70days')
  async getLast70DaysInvoicesByService(@Param('serviceId', ParseIntPipe) serviceId: number): Promise<number> {
    return this.reportsService.getLast70DaysInvoicesByService(serviceId);
  }

  @Get('invoices/service/:serviceId/last90days')
  async getLast90DaysInvoicesByService(@Param('serviceId', ParseIntPipe) serviceId: number): Promise<number> {
    return this.reportsService.getLast90DaysInvoicesByService(serviceId);
  }

  @Get('invoices/service/:serviceId/year')
  async getYearInvoicesByService(@Param('serviceId', ParseIntPipe) serviceId: number): Promise<number> {
    return this.reportsService.getYearInvoicesByService(serviceId);
  }
}
