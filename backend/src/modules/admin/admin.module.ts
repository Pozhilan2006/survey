import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SurveysModule } from '../surveys/surveys.module';
import { ParticipationsModule } from '../participations/participations.module';
import { CapacityModule } from '../capacity/capacity.module';

@Module({
    imports: [SurveysModule, ParticipationsModule, CapacityModule],
    controllers: [AdminController],
})
export class AdminModule { }
