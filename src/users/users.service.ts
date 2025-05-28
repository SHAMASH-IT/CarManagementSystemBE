import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
        id: parseInt(id.toString(), 10), // Assurez-vous que l'ID est un entier
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  async getAllUsers() {
    return this.prisma.user.findMany(); // Cette ligne récupère tous les utilisateurs
  }

  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
  // 2. Créer un nouvel utilisateur
  async createUser(createUserDto: any) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingEmail) {
      throw new BadRequestException('Email is already in use');
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: createUserDto.phone },
    });

    if (existingPhone) {
      throw new BadRequestException('Phone number is already in use');
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        hash: hashedPassword, // Utilisation du champ hash pour le mot de passe
        phone: createUserDto.phone,
        role: createUserDto.role || 'CLIENT',
        matf: createUserDto.matf, // Utilisation d'un rôle par défaut si non spécifié
      },
    });
    return user;
  }

  // 3. Mettre à jour un utilisateur (y compris le mot de passe)
  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<void> {
    const { name, email, phone, newPassword, role, matf } = updateUserDto; // Ajoute role au destructuring

    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(id.toString(), 10) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    // Vérification de l'unicité de l'email et du téléphone
    if (email && email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new BadRequestException('Email is already in use');
      }
    }

    if (phone && phone !== user.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new BadRequestException('Phone number is already in use');
      }
    }
    // Préparer les données de mise à jour
    let updatedData: any = { name, email, phone, role, matf }; // Utilisation correcte du champ 'role'

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
      where: { id: parseInt(id.toString(), 10) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id: parseInt(id.toString(), 10) },
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
        userId: dto.userId, // Assurer que le userId est fourni
      },
    });
  }

  // 2. Récupérer un véhicule par ID
  async getVehicle(id: number): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: parseInt(id.toString(), 10) },
      include: { user: true, positions: true, appointments: true }, // Inclure les relations si nécessaire
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
      where: { id: parseInt(id.toString(), 10) },
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
    // Vérifier si le véhicule existe
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: parseInt(id.toString(), 10) },
      include: {
        appointments: {
          include: {
            positions: true, // Inclure les positions liées à chaque rendez-vous
          },
        },
      },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Créer les transactions pour chaque rendez-vous
    const transactions = vehicle.appointments
      .filter((appointment) =>
        ['PENDING', 'RESERVED'].includes(appointment.status),
      )
      .flatMap((appointment) => {
        // Récupérer l'ID de la location associée au rendez-vous
        const locationId = appointment.positions.find(
          (p) => p.appointmentId === appointment.id,
        )?.locationId;

        return [
          // Supprimer les positions associées au rendez-vous
          this.prisma.position.deleteMany({
            where: { appointmentId: appointment.id },
          }),
          // Mettre à jour le statut du rendez-vous en CANCELED
          this.prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: 'CANCELLED' },
          }),
          // Mettre à jour la location si elle existe
          ...(locationId
            ? [
                this.prisma.location.update({
                  where: { id: locationId },
                  data: { status: 'EMPTY' },
                }),
              ]
            : []),
        ];
      });

    // Ajouter la mise à jour du statut du véhicule en HIDDEN

    // Exécuter toutes les transactions dans une transaction Prisma
    await this.prisma.$transaction(transactions);
    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { statut: 'HIDDEN' },
    });
    return updatedVehicle;
  }

  // 5. Récupérer tous les véhicules d'un utilisateur
  async getVehiclesByUserId(userId: number): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: {
        userId: parseInt(userId.toString(), 10),
        statut: 'VISIBLE', // Vérifie que le statut est HIDDEN
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
  async getUnreadUserNotifications(userId: number) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);

  const baseConditions: any[] = [
    {
      appointment: {
        vehicle: {
          userId,
        },
      },
    },
    {
      intervention: {
        appointment: {
          vehicle: {
            userId,
          },
        },
      },
    },
  ];

  if (user.role === 'PROVIDER') {
    baseConditions.push({
      piece: {
        category: {
          providerId: userId,
        },
      },
    });
  }

  const notifications = await this.prisma.notification.findMany({
    where: {
      read: false,
      OR: baseConditions,
    },
    include: {
      appointment: {
        select: {
          id: true,
          date: true,
          time: true,
        },
      },
      intervention: {
        select: {
          id: true,
          description: true,
          status: true,
        },
      },
      piece: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return notifications;
}

  async markAllNotificationsAsRead(userId: number) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);

  const conditions: any[] = [
    {
      appointment: {
        vehicle: {
          userId,
        },
      },
    },
    {
      intervention: {
        appointment: {
          vehicle: {
            userId,
          },
        },
      },
    },
  ];

  if (user.role === 'PROVIDER') {
    conditions.push({
      piece: {
        category: {
          providerId: userId,
        },
      },
    });
  }

  const result = await this.prisma.notification.updateMany({
    where: {
      read: false,
      OR: conditions,
    },
    data: {
      read: true,
    },
  });

  return {
    message: `${result.count} notifications marquées comme lues.`,
    updatedCount: result.count,
  };
}

 async countUnreadNotifications(userId: number): Promise<number> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);

  const conditions: any[] = [
    {
      appointment: {
        vehicle: {
          userId,
        },
      },
    },
    {
      intervention: {
        appointment: {
          vehicle: {
            userId,
          },
        },
      },
    },
  ];

  if (user.role === 'PROVIDER') {
    conditions.push({
      piece: {
        category: {
          providerId: userId,
        },
      },
    });
  }

  const count = await this.prisma.notification.count({
    where: {
      read: false,
      OR: conditions,
    },
  });

  return count;
}

}
