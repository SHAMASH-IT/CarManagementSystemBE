import { Injectable } from '@nestjs/common';
import { CreatePieceDto } from './dto/create-piece.dto';
import { UpdatePieceDto } from './dto/update-piece.dto';

@Injectable()
export class PieceService {
  create(createPieceDto: CreatePieceDto) {
    return 'This action adds a new piece';
  }

  findAll() {
    return `This action returns all piece`;
  }

  findOne(id: number) {
    return `This action returns a #${id} piece`;
  }

  update(id: number, updatePieceDto: UpdatePieceDto) {
    return `This action updates a #${id} piece`;
  }

  remove(id: number) {
    return `This action removes a #${id} piece`;
  }
}
