// dto/update-intervention.dto.ts
import { IsOptional, IsString, IsNumber, IsDateString, IsEnum , IsArray, IsInt, Min, Max } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateInterventionDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
  @IsOptional()
    @IsArray()
    pieces?: { id: number; quantity: number; price: number }[]; 
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rate?: number;
  
    @IsOptional()
    @IsString()
    commentaire?: string;
}
