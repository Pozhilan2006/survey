import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ParticipationStateMachine {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    private readonly validTransitions: Record<ParticipationStatus, ParticipationStatus[]> = {
        NOT_STARTED: [ParticipationStatus.STARTED],
        STARTED: [ParticipationStatus.SUBMITTED],
        SUBMITTED: [ParticipationStatus.APPROVED, ParticipationStatus.REJECTED],
        APPROVED: [],
        REJECTED: [],
    };

    async transition(
        participationId: string,
        toStatus: ParticipationStatus,
        userId?: string,
        metadata?: any,
    ) {
        const participation = await this.prisma.surveyParticipation.findUnique({
            where: { id: participationId },
        });

        if (!participation) {
            throw new BadRequestException('Participation not found');
        }

        const allowedTransitions = this.validTransitions[participation.status];

        if (!allowedTransitions.includes(toStatus)) {
            throw new BadRequestException(
                `Invalid transition from ${participation.status} to ${toStatus}`,
            );
        }

        const oldState = { status: participation.status };
        const newState = { status: toStatus };

        // Update participation with new status
        const updateData: any = { status: toStatus };

        if (toStatus === ParticipationStatus.STARTED) {
            updateData.startedAt = new Date();
        } else if (toStatus === ParticipationStatus.SUBMITTED) {
            updateData.submittedAt = new Date();
        } else if (toStatus === ParticipationStatus.APPROVED || toStatus === ParticipationStatus.REJECTED) {
            updateData.reviewedAt = new Date();
            updateData.reviewedBy = userId;
        }

        const updated = await this.prisma.surveyParticipation.update({
            where: { id: participationId },
            data: updateData,
        });

        // Log audit event
        await this.auditService.logEvent({
            entityType: 'SurveyParticipation',
            entityId: participationId,
            userId,
            eventType: `STATUS_CHANGE_${toStatus}`,
            oldState,
            newState,
            metadata,
        });

        return updated;
    }
}
