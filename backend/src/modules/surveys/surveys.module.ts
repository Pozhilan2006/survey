import { Module } from '@nestjs/common';
import { SurveysService } from './surveys.service';

@Module({
    providers: [SurveysService],
    exports: [SurveysService],
})
export class SurveysModule { }
