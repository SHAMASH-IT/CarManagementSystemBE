import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class StartInterventionDto {
  @IsString()
  description: string;

  @IsString()
  endDate: string; // Format: 'YYYY-MM-DDTHH:mm:ss'

  @IsInt()
  price: number;

  @IsOptional()
  @IsArray()
  pieces?: { id: number; quantity: number; price: number }[];  // Tableau des pièces associées à l'intervention
}
