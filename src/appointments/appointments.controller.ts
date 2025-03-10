import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Createappointment } from './dto';

@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly service: AppointmentsService) {}

    //  Create appointment
    @Post('create')
    async createAppointment(@Body() dto: Createappointment) {
        return this.service.createAppointment(dto);
    }

    //   all appointments
    @Get('all-appointments')
    async getAllAppointments() {
        return this.service.getAllAppointments();
    }

    //  all appointments for a specific vehicle
    @Get('vehicle-appointments/:vehicleId')
    async getAppointmentsOfOneCar(@Param('vehicleId') vehicleId: string) {
        return this.service.getAppointmentsOfOneCar(parseInt(vehicleId));
    }

    //   all appointments for a specific date
    @Get('date-appointments/:date')
    async getAppointmentsByDate(@Param('date') date: string) {
        return this.service.getAppointmentsByDate(date);
    }

    
}
