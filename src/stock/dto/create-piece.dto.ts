import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePieceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNumber()
  @Min(0)
  threshold: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  categoryId: number;

  @IsNumber()
  initialPrice: number;

  @IsString()
  marque :string;
}
    