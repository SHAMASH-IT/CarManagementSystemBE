import { Controller,Post,Body,Patch,Param,Get } from '@nestjs/common';
import { CreateParking , UpdateParking} from './dto';
import { ParkingService } from './parking.service';

@Controller('parking')
export class ParkingController {
    constructor(private parkingservice : ParkingService) {}
    @Post('create-parking')
        async createAppointment(@Body() dto: CreateParking) {
            try {
                return await this.parkingservice.createParking(dto);
            } catch (error) {
                throw error; 
            }
        }
    @Patch('edit-parking/:id')
        async updateParking(@Param('id') id: string, @Body() dto: UpdateParking) {
            try {
                return await this.parkingservice.updateParking(parseInt(id), dto);
            } catch (error) {
                throw error; 
            }
        }
    
    @Get('all-parkings')
    async getParkings() {
        try {
            return await this.parkingservice.getParkings();
        } catch (error) {
            throw error; 
        }
    }

    
    @Get('parking-by-service/:serviceId')
    async getParkingByService(@Param('serviceId') serviceId: string) {
        try {
            return await this.parkingservice.getParkingByService(parseInt(serviceId));
        } catch (error) {
            throw error; 
        }
    }

    @Get('parking/:id')
    async getParkingById(@Param('id') id: string) {
        try {
            return await this.parkingservice.getParkingById(parseInt(id));
        } catch (error) {
            throw error; 
        }
    }

    
    @Get(':parkingId/empty-locations')
    async getEmptyLocationsByParkingId(@Param('parkingId') parkingId: string) {
        try {
            return await this.parkingservice.getEmptyLocationsByParkingId(parseInt(parkingId));
        } catch (error) {
            throw error; 
        }
    }
    @Get(':serviceId/service-empty-locations')
    async getEmptyLocationsByServiceId(@Param('serviceId') serviceId:string){
        try{
            return await this.parkingservice.getEmptyLocationsByServiceId(parseInt(serviceId));

        }catch(error){
            throw error; 
        }
    }
    



}
