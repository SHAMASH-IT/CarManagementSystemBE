// dto/start-intervention.dto.ts
import { IsString, IsNumber, IsDateString } from 'class-validator';

export class StartInterventionDto {
  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsDateString()
  endDate: string;
}
