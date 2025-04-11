import { Controller, Get, Post, Patch, Param, Body, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from '@prisma/client';

@Controller('users')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. Récupérer un utilisateur par son ID
  @Get(':id')
  async getUser(@Param('id') id: number) {
    return this.authService.getUserById(id);
  }

  // 2. Créer un nouvel utilisateur
  @Post()
  async createUser(@Body() createUserDto: any) {
    return this.authService.createUser(createUserDto);
  }
  @Get()
  async getAllUsers() {
    return this.authService.getAllUsers();
  }
  // 3. Mettre à jour un utilisateur (y compris le mot de passe)
  @Patch(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<void> {
    return this.authService.updateUser(id, updateUserDto);
  }

  // 4. Supprimer un utilisateur
  @Delete(':id')
  async deleteUser(@Param('id') id: number) {
    return this.authService.deleteUser(id);
  }
  @Post('vehicle')
  async createVehicle(@Body() createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    return this.authService.createVehicle(createVehicleDto);
  }

  // 2. Récupérer un véhicule par ID
  @Get('vehicle/:id')
  async getVehicle(@Param('id') id: number): Promise<Vehicle> {
    return this.authService.getVehicle(id);
  }

  // 3. Mettre à jour un véhicule
  @Patch('vehicle/:id')
  async updateVehicle(
    @Param('id') id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.authService.updateVehicle(id, updateVehicleDto);
  }

  // 4. Supprimer un véhicule
  @Delete('vehicle/:id')
  async deleteVehicle(@Param('id') id: number): Promise<Vehicle> {
    return this.authService.deleteVehicle(id);
  }

  // 5. Récupérer tous les véhicules d'un utilisateur
  @Get('vehicle/user/:userId')
  async getVehiclesByUserId(@Param('userId') userId: number): Promise<Vehicle[]> {
    return this.authService.getVehiclesByUserId(userId);
  }
}
