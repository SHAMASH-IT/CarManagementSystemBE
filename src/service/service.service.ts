import { Injectable } from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServiceService {
 constructor(private prisma: PrismaService) {}

  async create(createServiceDto: CreateServiceDto) {
  return this.prisma.service.create({ data: createServiceDto });
}



  async findAll() {
    return this.prisma.service.findMany();
  }

  async findOne(id: number) {
    return this.prisma.service.findUnique({ where: { id } });
  }

  async update(id: number, updateServiceDto: UpdateServiceDto) {
  const service = await this.prisma.service.findUnique({ where: { id } });
  if (!service) {
    throw new Error(`Service with ID ${id} not found`);
  }
  return this.prisma.service.update({ where: { id }, data: updateServiceDto });
}

async remove(id: number) {
  const service = await this.prisma.service.findUnique({ where: { id } });
  if (!service) {
    throw new Error(`Service with ID ${id} not found`);
  }
  return this.prisma.service.delete({ where: { id } });
}
}
