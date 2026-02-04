import { Module } from '@nestjs/common';
import { SelectionsService } from './selections.service';
import { CapacityModule } from '../capacity/capacity.module';

@Module({
    imports: [CapacityModule],
    providers: [SelectionsService],
    exports: [SelectionsService],
})
export class SelectionsModule { }
