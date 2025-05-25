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
  @Get('predict-revenue')
  async predictFutureRevenue() {
    try {
      const predictions = await this.reportsService.predictFutureRevenue();
      return {
        message: 'Prédiction des chiffres d\'affaires pour les 6 prochains mois',
        predictions,
      };
    } catch (error) {
      return {
        message: 'Erreur lors de la prédiction des chiffres d\'affaires',
        error: error.message,
      };
    }
  }

  @Get('appointments/:providerId/today')
  async getTodayAppointmentsProvider(@Param('providerId') providerId: string) {
    return this.reportsService.getAppointmentsByProviderAndDate(+providerId, 'today');
  }

  @Get('appointments/:providerId/last-28-days')
  async getLast28DaysAppointmentsProvider(@Param('providerId') providerId: string) {
    return this.reportsService.getAppointmentsByProviderAndDate(+providerId, 'last28days');
  }

  @Get('appointments/:providerId/last-70-days')
  async getLast70DaysAppointmentsProvider(@Param('providerId') providerId: string) {
    return this.reportsService.getAppointmentsByProviderAndDate(+providerId, 'last70days');
  }

  @Get('appointments/:providerId/specific-day')
  async getSpecificDayAppointmentsProvider(
    @Param('providerId') providerId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      return { error: 'You must provide a date in the query parameter (YYYY-MM-DD).' };
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return { error: 'Invalid date format. Use YYYY-MM-DD.' };
    }

    return this.reportsService.getAppointmentsByProviderAndDate(+providerId, 'specific', parsedDate);
  }

  
  @Get('appointments/provider/:providerId')
  async getAppointmentsByProvider(@Param('providerId') providerId: string) {
    return this.reportsService.getAppointmentsByProvider(+providerId);
  }

  // Récupérer les rendez-vous d’un provider pour un service donné
  @Get('appointments/provider/:providerId/service/:serviceId')
  async getAppointmentsByProviderAndService(
    @Param('providerId') providerId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.reportsService.getAppointmentsByProviderAndService(
      +providerId,
      +serviceId,
    );
  }
}
