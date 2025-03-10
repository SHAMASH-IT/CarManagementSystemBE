import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateParking,UpdateParking } from './dto';

@Injectable()
export class ParkingService {
    constructor(private prisma : PrismaService) {}
    async createParking(dto: CreateParking) {
        // Vérifier si serviceId est fourni et si le service existe
        if (dto.serviceId) {
            const service = await this.prisma.service.findUnique({
                where: { id: dto.serviceId },
            });

            if (!service) {
                throw new NotFoundException('Service non trouvé !');
            }
        }

        //create parking
        const parking = await this.prisma.parking.create({
            data: {
                name: dto.name,
                places: dto.places,
                serviceId: dto.serviceId, 
            },
        });
        // create locations 
        for (let i = 1; i <= dto.places; i++) {
            await this.prisma.location.create({
                data: {
                    name: `${dto.name}${i}`, 
                    parkingId: parking.id, 
                },
            });
        }

        return parking; 
    }


    async updateParking(id: number, dto: UpdateParking) {
        // Vérifier si le parking existe
        const parking = await this.prisma.parking.findUnique({
            where: { id },
        });
    
        if (!parking) {
            throw new NotFoundException('Parking non trouvé !');
        }
    
        // Mettre à jour le parking
        const updatedParking = await this.prisma.parking.update({
            where: { id },
            data: {
                name: dto.name,
                places: dto.places,
            },
        });
    
        // Si le nombre de places est modifié, mettre à jour les locations
        if (dto.places !== undefined && dto.places !== parking.places) {
            // Supprimer les locations existantes
            await this.prisma.location.deleteMany({
                where: { parkingId: id },
            });
    
            // Créer de nouvelles locations en fonction du nouveau nombre de places
            for (let i = 1; i <= dto.places; i++) {
                await this.prisma.location.create({
                    data: {
                        name: `${updatedParking.name}${i}`, // Nom de la location (ex: D1, D2, D3, etc.)
                        parkingId: id,
                    },
                });
            }
        }
    
        return updatedParking;
    }


    async getParkings() {
        return this.prisma.parking.findMany({
            include: {
                locations: true, // Inclure les locations
            },
        });
    }

    /**
        * Récupérer les parkings d'un service donné, avec les locations et leurs statuts.
        * @param serviceId ID du service.
        * @returns Les parkings du service, avec les locations.
        */
    async getParkingByService(serviceId: number) {
        const parkings = await this.prisma.parking.findMany({
            where: { serviceId },
            include: {
                locations: true, // Inclure les locations
            },
        });

        if (!parkings || parkings.length === 0) {
            throw new NotFoundException('Aucun parking trouvé pour ce service !');
        }

        return parkings;
    }

    /**
        * Récupérer un parking par son ID, avec les locations et leurs statuts.
        * @param id ID du parking.
        * @returns Le parking, avec les locations.
        */
    async getParkingById(id: number) {
        const parking = await this.prisma.parking.findUnique({
            where: { id },
            include: {
                locations: true, // Inclure les locations
            },
        });

        if (!parking) {
            throw new NotFoundException('Parking non trouvé !');
        }

        return parking;
    }

    /**
        * Récupérer les locations libres d'un parking donné.
        * @param parkingId ID du parking.
        * @returns Les locations libres du parking.
        */
    async getEmptyLocationsByParkingId(parkingId: number) {
        const locations = await this.prisma.location.findMany({
            where: {
                parkingId,
                status: 'EMPTY', // Filtrer par statut EMPTY
            },
        });

        if (!locations || locations.length === 0) {
            throw new NotFoundException('Aucune location libre trouvée pour ce parking !');
        }

        return locations;
    }
    async getEmptyLocationsByServiceId(serviceId: number) {
        // Récupérer tous les parkings liés au service
        const parkings = await this.prisma.parking.findMany({
            where: { serviceId: serviceId },
            select: { id: true }, // Ne récupérer que les IDs
        });
    
        // Extraire les IDs des parkings
        const parkingIds = parkings.map(parking => parking.id);
    
        if (parkingIds.length === 0) {
            throw new NotFoundException('Aucun parking trouvé pour ce service !');
        }
    
        // Récupérer toutes les locations vides pour ces parkings
        const locations = await this.prisma.location.findMany({
            where: {
                parkingId: { in: parkingIds }, // Filtrer par une liste d'IDs
                status: 'EMPTY',
            },
        });
    
        if (locations.length === 0) {
            throw new NotFoundException('Aucune location libre trouvée pour ce service !');
        }
    
        return locations;
    }
    
}
