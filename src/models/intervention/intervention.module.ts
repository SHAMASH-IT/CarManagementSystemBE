import { Module } from '@nestjs/common';
import { InterventionService } from './intervention.service';
import { InterventionController } from './intervention.controller';

@Module({
  controllers: [InterventionController],
  providers: [InterventionService],
})
export class InterventionModule {}
