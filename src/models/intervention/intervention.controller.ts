import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InterventionService } from './intervention.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { UpdateInterventionDto } from './dto/update-intervention.dto';

@Controller('intervention')
export class InterventionController {
  constructor(private readonly interventionService: InterventionService) {}

  @Post()
  create(@Body() createInterventionDto: CreateInterventionDto) {
    return this.interventionService.create(createInterventionDto);
  }

  @Get()
  findAll() {
    return this.interventionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.interventionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInterventionDto: UpdateInterventionDto) {
    return this.interventionService.update(+id, updateInterventionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.interventionService.remove(+id);
  }
}
