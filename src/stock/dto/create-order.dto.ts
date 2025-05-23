import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateOrderDto {
  @IsInt()
  pieceId: number;

  @IsInt()
  userId: number;

  @IsInt()
  @IsPositive()
  quantity: number;

   @IsOptional()
    @IsInt()
    discount?: number;

}
