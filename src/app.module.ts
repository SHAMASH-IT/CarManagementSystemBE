import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './models/appointment/appointment.module';
import { ServiceModule } from './models/service/service.module';
import { ParkingModule } from './models/parking/parking.module';
import { LocationModule } from './models/location/location.module';
import { PositionModule } from './models/position/position.module';
import { VehicleModule } from './models/vehicle/vehicle.module';
import { InterventionModule } from './models/intervention/intervention.module';
import { OrderModule } from './models/order/order.module';
import { PieceModule } from './models/piece/piece.module';
import { CategoryModule } from './models/category/category.module';
import { AdminModule } from './models/admin/admin.module';
import { ProviderModule } from './models/provider/provider.module';
import { ClientModule } from './models/client/client.module';


@Module({
  imports: [AppointmentModule, ServiceModule, ParkingModule, LocationModule, PositionModule, VehicleModule, InterventionModule, OrderModule, PieceModule, CategoryModule, AdminModule, ProviderModule, ClientModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
