import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { ParticipationsModule } from '../participations/participations.module';
import { SelectionsModule } from '../selections/selections.module';
import { EligibilityModule } from '../eligibility/eligibility.module';

@Module({
    imports: [ParticipationsModule, SelectionsModule, EligibilityModule],
    controllers: [UserController],
})
export class UserModule { }
