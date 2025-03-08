import { Param,Controller,Get,Post,Patch,Delete, Body,NotFoundException, } from '@nestjs/common';
import { Createappointment } from './dto';
import { Vehicle, Service } from '@prisma/client'; // Import Vehicle and Service models
import { AppointmentsService } from './appointments.service';


@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) {}
    
    
    @Post('create-appointment')
    async createAppointment(@Body() dto: Createappointment) {
        try {
            // Appeler la méthode du service pour créer le rendez-vous
            return await this.appointmentsService.createAppointment(dto);
        } catch (error) {
            throw error; // Renvoyer l'erreur telle quelle
        }
    }

    @Get('available-slots/:date')
    async getAvailableSlots(@Param('date') date: string) {
        return this.appointmentsService.getAvailableSlots(date);
    }
    @Get('get-appointment')
    getAppointment(){

    }
    @Get('all-appointment')
    getAllAppointment(){}

    
    @Patch('edit-appointment')
    editAppointment(){

    }
    @Delete('delete-appointment')
    deleteAppointment(){

    }
}
