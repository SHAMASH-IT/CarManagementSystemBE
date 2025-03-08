import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class Createappointment {
    @IsDateString()
    date: string; // Format: YYYY-MM-DD

    @IsDateString()
    time: string; // Format: HH:MM

    @IsInt()
    @IsOptional()
    vehicleId: number; // ID du véhicule

    @IsInt()
    @IsOptional()
    serviceId: number; // ID du service
}