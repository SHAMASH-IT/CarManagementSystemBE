import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class Createappointment {
    @IsDateString()
    date: string; // Format: YYYY-MM-DD

    @IsDateString()
    time: string; // Format: HH:MM

    @IsInt()
    @IsOptional()
    vehicleId: number; 

    @IsInt()
    @IsOptional()
    serviceId: number; 
}

export class updateAppointment{
    @IsDateString()
    @IsOptional()
    date?: string; 

    @IsDateString()
    @IsOptional()
    time?: string;
}