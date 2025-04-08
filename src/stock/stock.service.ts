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

    async createCategory(dto: CreateCategoryDto) {
      return this.prisma.category.create({
        data: dto,
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
      async placeOrder(dto: CreateOrderDto) {
        const piece = await this.prisma.piece.findUnique({
          where: { id: dto.pieceId },
        });
      
        if (!piece) {
          throw new BadRequestException("Pièce introuvable.");
        }
      
        if (dto.quantity > piece.stock) {
          throw new BadRequestException("Quantité demandée supérieure au stock disponible.");
        }
      
        // ✅ Création de la commande + mise à jour du stock dans une transaction
        const [order] = await this.prisma.$transaction([
          this.prisma.order.create({
            data: {
              ...dto,
              date: new Date(),
              status: Status.RESERVED,
            },
          }),
          this.prisma.piece.update({
            where: { id: dto.pieceId },
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
      
        if (order.status === Status.CANCELLED || order.status === Status.COMPLETED) {
          throw new BadRequestException("Impossible d'annuler cette commande.");
        }
      
        const piece = await this.prisma.piece.findUnique({
          where: { id: order.pieceId },
        });
      
        if (!piece) {
          throw new BadRequestException("Pièce introuvable.");
        }
      
        // ✅ Mettre à jour la commande + remettre les pièces dans le stock
        const [updatedOrder] = await this.prisma.$transaction([
          this.prisma.order.update({
            where: { id },
            data: { status: Status.CANCELLED },
          }),
          this.prisma.piece.update({
            where: { id: order.pieceId },
            data: {
              stock: piece.stock + order.quantity,
            },
          }),
        ]);
      
        return updatedOrder;
      }
    }
