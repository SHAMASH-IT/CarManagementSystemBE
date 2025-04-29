import { Controller, Get, Param, Post, Body, Patch, BadRequestException, Query, ParseIntPipe, Delete } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { StartInterventionDto } from './dto/start-intervention';
import { UpdateInterventionDto } from './dto/update-intervention';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  // 1. Récupérer les rendez-vous de statut RESERVED
  @Get('appointments/reserved')
  async getReservedAppointments() {
    return this.progressService.getReservedAppointments();
  }

  // 2. Commencer une intervention à partir d’un rendez-vous
  @Post('intervention/start/:appointmentId')
  async startIntervention(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: StartInterventionDto,
  ) {
    return this.progressService.startIntervention(appointmentId, dto);
  }

  // 3. Récupérer une intervention par son ID
  @Get(':id')
async getIntervention(@Param('id') id: string) {
  const interventionId = parseInt(id, 10);

  if (isNaN(interventionId)) {
    throw new BadRequestException('L\'ID doit être un nombre valide');
  }

  return this.progressService.getIntervention(interventionId);
}


  // 4. Mettre à jour une intervention
  @Patch('update/:id')
async updateIntervention(
  @Param('id') id: string,  // id est récupéré comme chaîne
  @Body() dto: UpdateInterventionDto,
) {
  const interventionId = Number(id);  // Convertir id en nombre entier
  if (isNaN(interventionId)) {
    throw new BadRequestException('ID must be a valid integer');
  }
  return this.progressService.updateIntervention(interventionId, dto);
}



  // 5. Compléter une intervention
  @Patch('intervention/complete/:id')
  async completeIntervention(@Param('id') id: string) {
    const interventionId = Number(id);
    if (isNaN(interventionId)) {
      throw new BadRequestException('ID must be a valid integer');
    }
    return this.progressService.completeIntervention(interventionId);
  }


// 6. Récupérer les interventions en cours (IN_PROGRESS)
@Get('interventions/in-progress')
async getInProgressInterventions() {
  return this.progressService.getInProgressInterventions();
}
  // 7. Récupérer les rendez-vous RESERVED par ID de service
  @Get('appointments/reserved/service/:serviceId')
  async getReservedAppointmentsByServiceId(@Param('serviceId') serviceId: string) {
    const id = parseInt(serviceId, 10);
    if (isNaN(id)) {
      throw new BadRequestException("L'ID de service doit être un nombre valide");
    }
    return this.progressService.getReservedAppointmentsByServiceId(id);
  }

  

  // 9. Récupérer les interventions en cours par ID de service
  @Get('interventions/in-progress/service/:serviceId')
  async getInProgressInterventionsByServiceId(@Param('serviceId') serviceId: string) {
    const id = parseInt(serviceId, 10);
    if (isNaN(id)) {
      throw new BadRequestException("L'ID de service doit être un nombre valide");
    }
    return this.progressService.getInProgressInterventionsByServiceId(id);
  }

  // 10. Récupérer les interventions en cours par ID de véhicule
  @Get('interventions/in-progress/vehicle/:carId')
  async getInProgressInterventionsByCarId(@Param('carId') carId: string) {
    const id = parseInt(carId, 10);
    if (isNaN(id)) {
      throw new BadRequestException("L'ID du véhicule doit être un nombre valide");
    }
    return this.progressService.getInProgressInterventionsByCarId(id);
  }
  @Get('appointments/reserved')
  async getReservedAppointmentsToday(
    @Query('todayOnly') todayOnly: string, // Reçu en tant que string dans les requêtes HTTP
  ) {
    const onlyToday = todayOnly === 'true'; // conversion en booléen
    return this.progressService.getReservedAppointmentsToday(onlyToday);
  }
  // ✅ GET /progress/invoice/:id
  @Get('invoice/:id')
  async getInvoiceById(@Param('id', ParseIntPipe) id: number) {
    return this.progressService.getInvoiceById(id);
  }

  // ❌ DELETE /progress/invoice/:id
  @Delete('invoice/:id')
  async deleteInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.progressService.deleteInvoice(id);
  }
  @Get('interventions/completed')
async getCompletedInterventions() {
  return this.progressService.getCompletedInterventions();
}
@Patch('intervention/rate/:id')
  async rateIntervention(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rate?: number; commentaire?: string },
  ) {
    return this.progressService.rateIntervention(id, body);
  }
}
