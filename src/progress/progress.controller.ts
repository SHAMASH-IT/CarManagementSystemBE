import { Controller, Get, Param, Post, Body, Patch } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { StartInterventionDto } from './dto/start-intervention';
import { UpdateInterventionDto } from './dto/update-intervention';

@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Get('appointments/reserved')
  getReservedAppointments() {
    return this.progressService.getReservedAppointments();
  }

  @Post('interventions/:id/start')
  startIntervention(
    @Param('id') id: number,
    @Body() dto: StartInterventionDto,
  ) {
    return this.progressService.startIntervention(Number(id), dto);
  }

  @Patch('interventions/:id')
  updateIntervention(
    @Param('id') id: number,
    @Body() dto: UpdateInterventionDto,
  ) {
    return this.progressService.updateIntervention(Number(id), dto);
  }

  @Get('interventions/:id')
  getIntervention(@Param('id') id: number) {
    return this.progressService.getIntervention(Number(id));
  }
/*
  @Post('interventions/:id/complete')
  completeIntervention(@Param('id') id: number) {
    return this.progressService.completeIntervention(Number(id));
  }*/
}
