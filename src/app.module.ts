import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ParkingModule } from './parking/parking.module';
import { PrismaService } from './prisma/prisma.service';



@Module({
  imports: [ParkingModule],
  controllers: [AppController],
  providers: [AppService,PrismaService],
})
export class AppModule {}
