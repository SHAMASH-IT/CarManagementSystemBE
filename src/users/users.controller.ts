import { Controller, Get, Post, Patch, Param, Body, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../users/dto/update-vehicle.dto';
import { Vehicle } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req) {
    return this.usersService.getMe(req.user.userId); // `sub` contient l'id de l'utilisateur
  }
  // 1. Récupérer un utilisateur par son ID
  @Get(':id')
  async getUser(@Param('id') id: number) {
    return this.usersService.getUserById(id);
  }

  // 2. Créer un nouvel utilisateur
  @Post()
  async createUser(@Body() createUserDto: any) {
    return this.usersService.createUser(createUserDto);
  }
  @Get()
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }
  // 3. Mettre à jour un utilisateur (y compris le mot de passe)
  @Patch(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<void> {
    return this.usersService.updateUser(id, updateUserDto);
  }

  // 4. Supprimer un utilisateur
  @Delete(':id')
  async deleteUser(@Param('id') id: number) {
    return this.usersService.deleteUser(id);
  }
  @Post('vehicle')
  async createVehicle(@Body() createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    return this.usersService.createVehicle(createVehicleDto);
  }

  // 2. Récupérer un véhicule par ID
  @Get('vehicle/:id')
  async getVehicle(@Param('id') id: number): Promise<Vehicle> {
    return this.usersService.getVehicle(id);
  }

  // 3. Mettre à jour un véhicule
  @Patch('vehicle/:id')
  async updateVehicle(
    @Param('id') id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    return this.usersService.updateVehicle(id, updateVehicleDto);
  }

  // 4. Supprimer un véhicule
  @Delete('vehicle/:id')
  async deleteVehicle(@Param('id') id: number): Promise<Vehicle> {
    return this.usersService.deleteVehicle(id);
  }

  // 5. Récupérer tous les véhicules d'un utilisateur
  @Get('vehicle/user/:userId')
  async getVehiclesByUserId(@Param('userId') userId: number): Promise<Vehicle[]> {
    return this.usersService.getVehiclesByUserId(userId);
  }
 
}
