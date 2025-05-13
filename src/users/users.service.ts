import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { Role, Vehicle } from '@prisma/client';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../users/dto/update-vehicle.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Récupérer un utilisateur par son ID
  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: parseInt(id.toString(), 10)  // Assurez-vous que l'ID est un entier
      }
    });
  
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async getAllUsers() {
    return this.prisma.user.findMany();  // Cette ligne récupère tous les utilisateurs
  }
  

  // 2. Créer un nouvel utilisateur
  async createUser(createUserDto: any) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        hash: hashedPassword,  // Utilisation du champ hash pour le mot de passe
        phone: createUserDto.phone,
        role: createUserDto.role || 'CLIENT',  // Utilisation d'un rôle par défaut si non spécifié
      }
    });
    return user;
  }

  // 3. Mettre à jour un utilisateur (y compris le mot de passe)
  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<void> {
    const { name, email, phone, newPassword, role } = updateUserDto; // Ajoute role au destructuring
  
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(id.toString(), 10) },
    });
  
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    // Préparer les données de mise à jour
    let updatedData: any = { name, email, phone, role }; // Utilisation correcte du champ 'role'
  
    // Si un mot de passe est fourni, le hacher et le mettre à jour
    if (newPassword) {
      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      updatedData.hash = newHashedPassword;
    }
  
    // Mettre à jour l'utilisateur dans la base de données
    await this.prisma.user.update({
      where: { id: parseInt(id.toString(), 10) },
      data: updatedData,
    });
  }
  

  // 4. Supprimer un utilisateur
  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {  id: parseInt(id.toString(), 10) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: {  id: parseInt(id.toString(), 10) },
    });
  }
  async createVehicle(dto: CreateVehicleDto): Promise<Vehicle> {
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: { registration: dto.registration },
    });
  
    if (existingVehicle) {
      throw new BadRequestException('Ce matricule est déjà enregistré.');
    }
    return this.prisma.vehicle.create({
      data: {
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        registration: dto.registration,
        userId: dto.userId,  // Assurer que le userId est fourni
      },
    });
  }

  // 2. Récupérer un véhicule par ID
  async getVehicle(id: number): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: {  id: parseInt(id.toString(), 10) },
      include: { user: true, positions: true, appointments: true },  // Inclure les relations si nécessaire
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return vehicle;
  }

  // 3. Mettre à jour un véhicule
  async updateVehicle(id: number, dto: UpdateVehicleDto): Promise<Vehicle> {
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: { registration: dto.registration },
    });
  
    if (existingVehicle) {
      throw new BadRequestException('Ce matricule est déjà enregistré.');
    }
    const vehicle = await this.prisma.vehicle.update({
      where: {  id: parseInt(id.toString(), 10)},
      data: {
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        registration: dto.registration,
      },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return vehicle;
  }

  // 4. Supprimer un véhicule
  async deleteVehicle(id: number): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.delete({
      where: {  id: parseInt(id.toString(), 10) },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    return vehicle;
  }

  // 5. Récupérer tous les véhicules d'un utilisateur
  async getVehiclesByUserId(userId: number): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: { 
        userId: parseInt(userId.toString(), 10)
       },
    });
  }
  async getMe(userId: number) {
 
    if (!userId) {
        
      throw new Error('User ID is required');
    }
  
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId, // Assure-toi de passer un ID valide
      },
      include: {
        vehicles: true,
        orders: true,
      },
    });
  
    return user;
  }
  
}
