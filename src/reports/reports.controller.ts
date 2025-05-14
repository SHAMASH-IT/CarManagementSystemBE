import { Controller, Get } from '@nestjs/common';
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
}
