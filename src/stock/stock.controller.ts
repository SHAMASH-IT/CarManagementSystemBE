import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Delete,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreatePieceDto } from './dto/create-piece.dto';
import { UpdatePieceDto } from './dto/update-piece.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}
  // 📦 Categories
  @Get('categories')
  getAllCategories() {
    return this.stockService.getAllCategories();
  }
  // 📦 Categories
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.stockService.createCategory(dto);
  }
  @Put('categories/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.stockService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.deleteCategory(id);
  }
  // 🧩 Pieces
  @Post('pieces')
  createPiece(@Body() dto: CreatePieceDto) {
    return this.stockService.createPiece(dto);
  }

  @Get('pieces')
  getAllPieces() {
    return this.stockService.getAllPieces();
  }

  @Get('pieces/:id')
  getPieceById(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.getPieceById(id);
  }

  @Put('pieces/:id')
  updatePiece(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePieceDto) {
    return this.stockService.updatePiece(id, dto);
  }

  @Delete('pieces/:id')
  deletePiece(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.deletePiece(id);
  }

  @Get('below-threshold')
  getPiecesBelowThreshold() {
    return this.stockService.getPiecesBelowThreshold();
  }

  // 📦 Orders
  @Get('orders')
  getAllOrders() {
    return this.stockService.getAllOrders();
  }

  @Post('order-by-name')
  async placeOrderByName(
    @Body()
    dto: {
      pieceName: string;
      quantity: number;
      userId: number;
    },
  ) {
    if (!dto.pieceName || !dto.quantity || !dto.userId) {
      throw new BadRequestException('Tous les champs sont requis.');
    }

    return this.stockService.placeOrder(dto);
  }

  @Patch('orders/:id')
  updateOrder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.stockService.updateOrder(id, dto);
  }
  @Patch('orders/:id/cancel')
  cancelOrder(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.cancelOrder(id);
  }

  @Patch('orders/:id/complete')
  completeOrder(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.completeOrder(id);
  }
  @Get('pieces/category/:categoryId')
getPiecesByCategory(@Param('categoryId') categoryId: string) {
  const id = parseInt(categoryId);
  if (isNaN(id)) throw new BadRequestException('ID invalide');
  return this.stockService.getAllPiecesByCategory(id);
}

}