import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { ParkingModule } from './parking/parking.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HistoryModule } from './history/history.module';
import { PrismaModule } from './prisma/prisma.module';
import { StockModule } from './stock/stock.module';
import { ReportsModule } from './reports/reports.module';
import { ConfigModule } from '@nestjs/config';







@Module({
  imports: [AppointmentsModule, UsersModule, ParkingModule,
     AuthModule, HistoryModule, PrismaModule, StockModule, 
     ReportsModule, ConfigModule.forRoot({ isGlobal: true }), ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
