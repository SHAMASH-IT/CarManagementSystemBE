import { Controller, Get, Post, Patch,Delete,Param, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Createappointment, updateAppointment } from './dto';

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
    // Cancel appointment
    @Delete('cancel/:appointmentId')
    async cancelAppointment(@Param('appointmentId') appointmentId: string) {
        return this.service.cancelAppointment(parseInt(appointmentId));
    }

    // Update appointment date and/or time
    @Patch('update/:appointmentId')
    async updateAppointmentDateTime(
        @Param('appointmentId') appointmentId: string,
        @Body() dto: updateAppointment
    ) {
        return this.service.updateAppointmentDateTime(parseInt(appointmentId), dto);
    }

    
}
