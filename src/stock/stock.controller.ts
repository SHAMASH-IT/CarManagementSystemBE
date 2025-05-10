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

  @Post('selling')
  async placeOrderSelling(
    @Body() dto: { pieces: { pieceId: number, quantity: number }[], userId: number }
  ) {
    try {
      return await this.stockService.placeOrderSelling(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  
  @Patch('selling/cancel/:id')
  async cancelOrderSelling(@Param('id') id: number) {
    try {
      return await this.stockService.cancelOrderSelling(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

 @Patch('selling/complete/:id')
  async completeOrderSelling(@Param('id') id: number) {
    try {
      return await this.stockService.completeOrderSelling(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  @Get('pieces/category/:categoryId')
getPiecesByCategory(@Param('categoryId') categoryId: string) {
  const id = parseInt(categoryId);
  if (isNaN(id)) throw new BadRequestException('ID invalide');
  return this.stockService.getAllPiecesByCategory(id);
}
@Post('buying')
  async placeOrderBuying(
    @Body() dto: { pieces: { pieceId: number, quantity: number }[], userId: number }
  ) {
    try {
      return await this.stockService.placeOrderBuying(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch('buying/cancel/:id')
  async cancelOrderBuying(@Param('id') id: number) {
    try {
      return await this.stockService.cancelOrderBuying(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch('buying/complete/:id')
  async completeOrderBuying(@Param('id') id: number) {
    try {
      return await this.stockService.completeOrderBuying(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
   @Get('buying/:userId')
  async getOrderBuyingBySupplier(@Param('userId') userId: number) {
    try {
      return await this.stockService.getOrderBuyingBySupplier(userId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  @Get('selling')
  async getOrderSelling() {
    try {
      return await this.stockService.getOrderSelling();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('buying')
  async getOrderBuying() {
    try {
      return await this.stockService.getOrderBuying();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}