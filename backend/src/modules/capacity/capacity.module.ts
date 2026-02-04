import { Module } from '@nestjs/common';
import { HoldStateMachine } from './hold-state-machine.service';
import { HoldCleanupService } from './hold-cleanup.service';
import { CapacityService } from './capacity.service';

@Module({
    providers: [HoldStateMachine, HoldCleanupService, CapacityService],
    exports: [HoldStateMachine, CapacityService],
})
export class CapacityModule { }
