import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}
@Post()
async createService(@Body() createServiceDto: CreateServiceDto) {
  return this.serviceService.create(createServiceDto);
}



  @Get()
  async getAllServices() {
    return this.serviceService.findAll();
  }

  @Get(':id')
  async getServiceById(@Param('id') id: number) {
    return this.serviceService.findOne(+id);
  }

  @Put(':id')
async updateService(@Param('id') id: number, @Body() updateServiceDto: UpdateServiceDto) {
  return this.serviceService.update(+id, updateServiceDto);
}

  @Delete(':id')
  async deleteService(@Param('id') id: number) {
    return this.serviceService.remove(+id);
  }
}
