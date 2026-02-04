import { Module } from '@nestjs/common';
import { ParticipationsService } from './participations.service';
import { ParticipationStateMachine } from './participation-state-machine.service';
import { AuditModule } from '../audit/audit.module';
import { CapacityModule } from '../capacity/capacity.module';

@Module({
    imports: [AuditModule, CapacityModule],
    providers: [ParticipationsService, ParticipationStateMachine],
    exports: [ParticipationsService],
})
export class ParticipationsModule { }
