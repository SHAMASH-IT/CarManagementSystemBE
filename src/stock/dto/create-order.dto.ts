import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

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
@IsOptional()
@IsString()
discountType?: string;

}
