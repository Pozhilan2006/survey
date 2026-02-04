import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HoldStateMachine } from './hold-state-machine.service';

@Injectable()
export class HoldCleanupService {
    constructor(private holdStateMachine: HoldStateMachine) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async cleanupExpiredHolds() {
        const result = await this.holdStateMachine.expireHolds();
        console.log(`Expired ${result.count} holds at ${new Date().toISOString()}`);
    }
}
