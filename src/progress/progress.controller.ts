import { Controller, Get, Param, Post, Body, Patch, BadRequestException } from '@nestjs/common';
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



  
}
