import { IsInt, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  pieceId: number;

  @IsInt()
  userId: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}
