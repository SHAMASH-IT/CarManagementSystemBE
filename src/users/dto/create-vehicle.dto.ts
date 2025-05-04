import { IsString, IsInt } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsInt()
  year: number;

  @IsString()
  registration: string;

  @IsInt()
  userId: number;  // L'ID de l'utilisateur auquel appartient ce véhicule
}
