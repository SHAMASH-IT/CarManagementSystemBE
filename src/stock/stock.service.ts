import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreatePieceDto } from './dto/create-piece.dto';
import { UpdatePieceDto } from './dto/update-piece.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { Status } from '@prisma/client';
import { UpdateOrderDto } from './dto/update-order.dto';
@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) {}
    async getAllCategories() {
      return this.prisma.category.findMany();
  }
    async createCategory(dto: CreateCategoryDto) {
      return this.prisma.category.create({
        data: dto,
      });
    }
    async updateCategory(id: number, dto: CreateCategoryDto) {
      const category = await this.prisma.category.findUnique({
        where: { id },
      });
    
      if (!category) {
        throw new BadRequestException("Catégorie introuvable.");
      }
    
      return this.prisma.category.update({
        where: { id },
        data: dto,
      });
    }
    async deleteCategory(id: number) {
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: { pieces: true }, // Pour vérifier les pièces liées
      });
    
      if (!category) {
        throw new BadRequestException("Catégorie introuvable.");
      }
    
      // Supprimer toutes les pièces liées à cette catégorie
      await this.prisma.piece.deleteMany({
        where: { categoryId: id },
      });
    
      // Supprimer la catégorie ensuite
      return this.prisma.category.delete({
        where: { id },
      });
    }
    
    async createPiece(dto: CreatePieceDto) {
        return this.prisma.piece.create({ data: dto });
      }
    
      async getAllPieces() {
        return this.prisma.piece.findMany({ include: { category: true } });
      }
    
      async getPieceById(id: number) {
        return this.prisma.piece.findUnique({
          where: { id },
          include: { category: true },
        });
      }
    
      async updatePiece(id: number, dto: UpdatePieceDto) {
        return this.prisma.piece.update({
          where: { id },
          data: dto,
        });
      }
    
      async deletePiece(id: number) {
        return this.prisma.piece.delete({ where: { id } });
      }
    
      async getPiecesBelowThreshold() {
        return this.prisma.$queryRaw`
          SELECT * FROM "Piece"
          WHERE "stock" <= "threshold"
        `;
      }

      async getAllOrders() {
        return this.prisma.order.findMany({
          orderBy: {
            date: 'desc'
          }
        });
      }

      async placeOrder(dto: { pieceName: string; quantity: number; userId: number }) {
        // 1. Récupérer la pièce par son nom
        const piece = await this.prisma.piece.findFirst({
          where: { name: dto.pieceName },
        });
      
        if (!piece) {
          throw new BadRequestException("Pièce introuvable avec le nom donné.");
        }
      
        // 2. Vérification de stock
        if (dto.quantity > piece.stock) {
          throw new BadRequestException("Quantité demandée supérieure au stock disponible.");
        }
      
        // 3. Créer la commande et mettre à jour le stock
        const [order] = await this.prisma.$transaction([
          this.prisma.order.create({
            data: {
              date: new Date(),
              status: Status.RESERVED,
              quantity: dto.quantity,
              userId: dto.userId,
              pieceId: piece.id, // on utilise l'id trouvé via le nom
            },
          }),
          this.prisma.piece.update({
            where: { id: piece.id },
            data: { stock: piece.stock - dto.quantity },
          }),
        ]);
      
        return order;
      }
      
      async updateOrder(id: number, dto: UpdateOrderDto) {
        const order = await this.prisma.order.findUnique({
          where: { id },
        });
      
        if (!order) {
          throw new BadRequestException("Commande introuvable.");
        }
      
        const piece = await this.prisma.piece.findUnique({
          where: { id: order.pieceId },
        });
      
        if (!piece) {
          throw new BadRequestException("Pièce introuvable.");
        }
      
        let stockUpdate = 0;
      
        // ✅ Si la quantité change, on ajuste le stock
        if (dto.quantity !== undefined && dto.quantity !== order.quantity) {
          const quantityDiff = dto.quantity - order.quantity;
      
          // Si on augmente la quantité, vérifier le stock dispo
          if (quantityDiff > 0 && quantityDiff > piece.stock) {
            throw new BadRequestException("Pas assez de stock pour cette modification.");
          }
      
          stockUpdate = -quantityDiff; // soustraction ou ajout selon le sens
        }
      
        const [updatedOrder] = await this.prisma.$transaction([
          this.prisma.order.update({
            where: { id },
            data: dto,
          }),
          this.prisma.piece.update({
            where: { id: order.pieceId },
            data: { stock: piece.stock + stockUpdate },
          }),
        ]);
      
        return updatedOrder;
      }
    
      async cancelOrder(id: number) {
        const order = await this.prisma.order.findUnique({
          where: { id },
        });
    
        if (!order) {
          throw new BadRequestException("Commande introuvable.");
        }
    
        if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
          throw new BadRequestException("Cette commande ne peut plus être annulée.");
        }
    
        return this.prisma.order.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });
      }

      async completeOrder(id: number) {
        const order = await this.prisma.order.findUnique({
          where: { id },
        });
    
        if (!order) {
          throw new BadRequestException("Commande introuvable.");
        }
    
        if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
          throw new BadRequestException("Cette commande est déjà terminée ou annulée.");
        }
    
        return this.prisma.order.update({
          where: { id },
          data: { status: 'COMPLETED' },
        });
      }
      async getAllPiecesByCategory(categoryId: number) {
        const category = await this.prisma.category.findUnique({
          where: { id: categoryId },
        });
      
        if (!category) {
          throw new BadRequestException("Catégorie introuvable.");
        }
      
        return this.prisma.piece.findMany({
          where: { categoryId },
          include: { category: true },
        });
      }
      
}