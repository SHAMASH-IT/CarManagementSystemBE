import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreatePieceDto } from './dto/create-piece.dto';
import { UpdatePieceDto } from './dto/update-piece.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { Status, StatusOrder } from '@prisma/client';
import { UpdateOrderDto } from './dto/update-order.dto';
@Injectable()
export class StockService {
    constructor(private prisma: PrismaService) {}
    async getAllCategories() {
      return this.prisma.category.findMany();
  }
    async createCategory(dto: CreateCategoryDto) {
  // Vérifier si une catégorie avec le même nom existe déjà
  const existingCategory = await this.prisma.category.findFirst({
    where: { name: dto.name },
  });

  if (existingCategory) {
    throw new BadRequestException("Une catégorie avec ce nom existe déjà.");
  }

  return this.prisma.category.create({
    data: dto,
  });
}

async updateCategory(id: number, dto: CreateCategoryDto) {
  // Vérifier si la catégorie existe
  const category = await this.prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new BadRequestException("Catégorie introuvable.");
  }

  // Vérifier si une autre catégorie avec le même nom existe déjà
  const existingCategory = await this.prisma.category.findFirst({
    where: {
      name: dto.name,
      id: { not: id }, // Exclure la catégorie actuelle
    },
  });

  if (existingCategory) {
    throw new BadRequestException("Une autre catégorie avec ce nom existe déjà.");
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
      const existingPiece = await this.prisma.piece.findFirst({
        where: { name: dto.name },
    });
    if (existingPiece) {
      throw new ConflictException('Une pièce avec ce nom existe déjà.');
  }
  
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
      /*
      async placeOrderSold(dto: { pieceName: string; quantity: number; userId: number }) {
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
      }*/
    
async placeOrderSelling(dto: { pieces: { pieceId: number, quantity: number }[]}) {
  const orderDate = new Date();

  // Vérifier la disponibilité de chaque pièce
  for (const item of dto.pieces) {
    const piece = await this.prisma.piece.findUnique({
      where: { id: item.pieceId },
    });

    if (!piece) {
      throw new BadRequestException(`Pièce avec ID ${item.pieceId} introuvable.`);
    }

    if (item.quantity > piece.stock) {
      throw new BadRequestException(`Quantité demandée pour la pièce ${piece.name} dépasse le stock disponible.`);
    }
  }

  // Créer la commande et les lignes de commande (OrderPiece) en une transaction
  const [order] = await this.prisma.$transaction([
    this.prisma.order.create({
      data: {
        date: orderDate,
        status: Status.RESERVED,
        ordertype: StatusOrder.SELLING,
        
      },
    }),
  ]);

  for (const item of dto.pieces) {
    await this.prisma.orderPiece.create({
      data: {
        orderId: order.id,
        pieceId: item.pieceId,
        quantity: item.quantity,
      },
    });

    await this.prisma.piece.update({
      where: { id: item.pieceId },
      data: { stock: { decrement: item.quantity } },
    });
  }

  return order;
}

     async cancelOrderSelling(id: number) {
  // Convertir l'ID en nombre
  const orderId = Number(id);

  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { orderPieces: true },
  });

  if (!order) {
    throw new BadRequestException("Commande introuvable.");
  }

  if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
    throw new BadRequestException("Cette commande ne peut plus être annulée.");
  }

  // Remettre en stock toutes les pièces de la commande
  for (const orderPiece of order.orderPieces) {
    await this.prisma.piece.update({
      where: { id: orderPiece.pieceId },
      data: { stock: { increment: orderPiece.quantity } },
    });
  }

  // Mettre à jour le statut de la commande
  return this.prisma.order.update({
    where: { id: orderId },  // Assurer la conversion ici aussi
    data: { status: 'CANCELLED' },
  });
}
/*
async cancelOrderSelling(id: number) {
  // 1. Récupérer la commande par son ID
  const order = await this.prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    throw new BadRequestException("Commande introuvable.");
  }

  // Vérifier si la commande est déjà annulée ou terminée
  if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
    throw new BadRequestException("Cette commande ne peut plus être annulée.");
  }

  // 2. Récupérer la pièce associée
  const piece = await this.prisma.piece.findUnique({
    where: { id: order.pieceId },
  });

  if (!piece) {
    throw new BadRequestException("Pièce introuvable.");
  }

  // 3. Récupérer la quantité à retourner
  const quantityToReturn = order.quantity;

  // 4. Effectuer la mise à jour dans une transaction
  const [updatedOrder] = await this.prisma.$transaction([
    // Mettre à jour le statut de la commande
    this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    }),
    // Mettre à jour le stock de la pièce
    this.prisma.piece.update({
      where: { id: piece.id },
      data: { stock: piece.stock + quantityToReturn },
    }),
  ]);

  return updatedOrder;
}*/


 async completeOrderSelling(id: number) {
  // Convertir l'ID en nombre
  const orderId = Number(id);

  // Vérifier que l'ID est bien un nombre
  if (isNaN(orderId)) {
    throw new BadRequestException("L'ID fourni n'est pas un nombre valide.");
  }

  // Récupérer la commande avec les pièces associées
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { 
      orderPieces: { 
        include: { piece: true } // Inclure chaque pièce dans les orderPieces
      } 
    },
  });

  if (!order) {
    throw new BadRequestException("Commande introuvable.");
  }

  if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
    throw new BadRequestException("Cette commande est déjà terminée ou annulée.");
  }

  // Calculer le total de la facture
  const total = order.orderPieces.reduce((acc, orderPiece) => {
    const pieceTotal = orderPiece.quantity * orderPiece.piece.price;
    return acc + pieceTotal;
  }, 0);

  // Créer la facture
  const invoice = await this.prisma.invoice.create({
    data: {
      total: total,
      description: `Facture pour la commande n°${orderId}`,
      orderId: orderId,
    },
  });

  // Mettre à jour l'état de la commande en "COMPLETED"
  await this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' },
  });

  return { order, invoice };
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
      
      // ✅ Création de la commande
async placeOrderBuying(dto: { pieces: { pieceId: number, quantity: number }[], userId: number }) {
  const orderDate = new Date();

  // Vérifier la disponibilité de chaque pièce
  for (const item of dto.pieces) {
    const piece = await this.prisma.piece.findUnique({
      where: { id: item.pieceId },
    });

    if (!piece) {
      throw new BadRequestException(`Pièce avec ID ${item.pieceId} introuvable.`);
    }
      

    
  }

  // Créer la commande et les lignes de commande (OrderPiece) en une transaction
  const [order] = await this.prisma.$transaction([
    this.prisma.order.create({
      data: {
        date: orderDate,
        status: Status.RESERVED,
        ordertype: StatusOrder.BUYING,
        userId: dto.userId,
      },
    }),
  ]);

  for (const item of dto.pieces) {
    await this.prisma.orderPiece.create({
      data: {
        orderId: order.id,
        pieceId: item.pieceId,
        quantity: item.quantity,
      },
    });

   
  }

  return order;
}

// ✅ Annulation de la commande (remettre en stock)
async cancelOrderBuying(id: number) {
  const orderId = Number(id); // Assurer la conversion de l'ID

  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { orderPieces: true },
  });

  if (!order) {
    throw new BadRequestException("Commande introuvable.");
  }

  if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
    throw new BadRequestException("Cette commande ne peut plus être annulée.");
  }

  // Mettre à jour le statut de la commande sans toucher au stock
  return this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELLED' },
  });
}


// ✅ Compléter la commande (ajouter aux pièces personnelles)
async completeOrderBuying(id: number) {
  const orderId = Number(id); // Assurer la conversion de l'ID

  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { orderPieces: true },
  });

  if (!order) {
    throw new BadRequestException("Commande introuvable.");
  }

  if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
    throw new BadRequestException("Cette commande est déjà terminée ou annulée.");
  }

  // Ajouter les pièces dans le stock (achat)
  for (const orderPiece of order.orderPieces) {
    await this.prisma.piece.update({
      where: { id: orderPiece.pieceId },
      data: { stock: { increment: orderPiece.quantity } },
    });
  }

  // Mettre à jour le statut de la commande
  return this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' },
  });
}

async getOrderSelling() {
    return this.prisma.order.findMany({
      where: {
        ordertype: StatusOrder.SELLING,  // Filtrer par type de commande (Vente)
        status: {
          not: Status.CANCELLED,  // Exclure les commandes annulées
        },
      },
      include: {
        orderPieces: {
          include: {
            piece: true  // Inclure les données de chaque pièce
          }
        },
        user: true,  // Inclure l'utilisateur
      },
    });
  }

  // Fonction pour récupérer toutes les commandes d'achat
async getOrderBuying() {
    return this.prisma.order.findMany({
      where: {
        ordertype: StatusOrder.BUYING,  // Filtrer par type de commande (Achat)
        status: {
          not: Status.CANCELLED,  // Exclure les commandes annulées
        },
      },
      include: {
        orderPieces: {
          include: {
            piece: true  // Inclure les données de chaque pièce
          }
        },
        user: true,  // Inclure l'utilisateur
      },
    });
  }
async getOrderBuyingBySupplier(userId: number) {
    return this.prisma.order.findMany({
      where: {
        userId: userId,
        ordertype: StatusOrder.BUYING,  // Filtrer par type de commande (Achat)
        status: {
          not: Status.CANCELLED,  // Exclure les commandes annulées
        },
      },
      include: {
        orderPieces: {
          include: {
            piece: true  // Inclure les données de chaque pièce
          }
        },
        user: true,  // Inclure l'utilisateur
      },
    });
  }
  async getSuppliers() {
  
      const suppliers = await this.prisma.user.findMany({
        where: { role: 'SUPPLIER' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });

      return suppliers;
    }
    async getInvoiceByOrderId(orderId: number) {
  const invoice = await this.prisma.invoice.findFirst({
    where: { orderId },
  });

  if (!invoice) {
    throw new NotFoundException(`Aucune facture trouvée pour la commande n°${orderId}.`);
  }

  return invoice;
}
}