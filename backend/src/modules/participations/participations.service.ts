import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipationStateMachine } from './participation-state-machine.service';
import { ParticipationStatus } from '@prisma/client';
import { HoldStateMachine } from '../capacity/hold-state-machine.service';

@Injectable()
export class ParticipationsService {
    constructor(
        private prisma: PrismaService,
        private stateMachine: ParticipationStateMachine,
        private holdStateMachine: HoldStateMachine,
    ) { }

    async startParticipation(userId: string, surveyReleaseId: string) {
        // Check if already exists
        const existing = await this.prisma.surveyParticipation.findUnique({
            where: {
                userId_surveyReleaseId: {
                    userId,
                    surveyReleaseId,
                },
            },
        });

        if (existing) {
            if (existing.status !== ParticipationStatus.NOT_STARTED) {
                throw new ConflictException('Participation already started');
            }
            // Transition existing participation
            return this.stateMachine.transition(
                existing.id,
                ParticipationStatus.STARTED,
                userId,
            );
        }

        // Create new participation
        const participation = await this.prisma.surveyParticipation.create({
            data: {
                userId,
                surveyReleaseId,
                status: ParticipationStatus.NOT_STARTED,
            },
        });

        // Transition to STARTED
        return this.stateMachine.transition(
            participation.id,
            ParticipationStatus.STARTED,
            userId,
        );
    }

    async submitParticipation(participationId: string, userId: string) {
        const participation = await this.prisma.surveyParticipation.findUnique({
            where: { id: participationId },
            include: {
                selections: true,
                holds: {
                    where: { isReleased: false },
                },
            },
        });

        if (!participation) {
            throw new BadRequestException('Participation not found');
        }

        if (participation.userId !== userId) {
            throw new BadRequestException('Not authorized');
        }

        if (participation.status !== ParticipationStatus.STARTED) {
            throw new BadRequestException('Participation not in STARTED state');
        }

        // Validate at least one selection
        if (participation.selections.length === 0) {
            throw new BadRequestException('At least one selection required');
        }

        // Validate all holds are not expired
        const now = new Date();
        const expiredHolds = participation.holds.filter(h => h.expiresAt < now);

        if (expiredHolds.length > 0) {
            throw new BadRequestException('Some holds have expired, please reselect options');
        }

        // Transition to SUBMITTED
        return this.stateMachine.transition(
            participationId,
            ParticipationStatus.SUBMITTED,
            userId,
        );
    }

    async approveParticipation(participationId: string, adminId: string) {
        const participation = await this.prisma.surveyParticipation.findUnique({
            where: { id: participationId },
        });

        if (!participation) {
            throw new BadRequestException('Participation not found');
        }

        if (participation.status !== ParticipationStatus.SUBMITTED) {
            throw new BadRequestException('Participation not in SUBMITTED state');
        }

        // Convert holds to utilization
        await this.holdStateMachine.convertHoldsToUtilization(participationId);

        // Transition to APPROVED
        return this.stateMachine.transition(
            participationId,
            ParticipationStatus.APPROVED,
            adminId,
            { approvedBy: adminId },
        );
    }

    async rejectParticipation(participationId: string, adminId: string, reason?: string) {
        const participation = await this.prisma.surveyParticipation.findUnique({
            where: { id: participationId },
            include: {
                holds: {
                    where: { isReleased: false },
                },
            },
        });

        if (!participation) {
            throw new BadRequestException('Participation not found');
        }

        if (participation.status !== ParticipationStatus.SUBMITTED) {
            throw new BadRequestException('Participation not in SUBMITTED state');
        }

        // Release all holds
        for (const hold of participation.holds) {
            await this.holdStateMachine.releaseHold(hold.id);
        }

        // Transition to REJECTED
        return this.stateMachine.transition(
            participationId,
            ParticipationStatus.REJECTED,
            adminId,
            { rejectedBy: adminId, reason },
        );
    }

    async getParticipation(participationId: string, userId: string) {
        const participation = await this.prisma.surveyParticipation.findUnique({
            where: { id: participationId },
            include: {
                selections: {
                    include: {
                        option: true,
                    },
                },
                surveyRelease: {
                    include: {
                        survey: true,
                    },
                },
            },
        });

        if (!participation) {
            throw new BadRequestException('Participation not found');
        }

        if (participation.userId !== userId) {
            throw new BadRequestException('Not authorized');
        }

        return participation;
    }

    async listParticipations(filters: {
        status?: ParticipationStatus;
        surveyId?: string;
        userId?: string;
    }) {
        const where: any = {};

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.userId) {
            where.userId = filters.userId;
        }

        if (filters.surveyId) {
            where.surveyRelease = {
                surveyId: filters.surveyId,
            };
        }

        return this.prisma.surveyParticipation.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                surveyRelease: {
                    include: {
                        survey: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                selections: {
                    include: {
                        option: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
}
