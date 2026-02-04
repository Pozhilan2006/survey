import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HoldStateMachine } from '../capacity/hold-state-machine.service';
import { ParticipationStatus } from '@prisma/client';

@Injectable()
export class SelectionsService {
    constructor(
        private prisma: PrismaService,
        private holdStateMachine: HoldStateMachine,
    ) { }

    async addSelection(
        participationId: string,
        optionId: string,
        userId: string,
        holdExpiryMinutes: number,
    ) {
        const participation = await this.prisma.surveyParticipation.findUnique({
            where: { id: participationId },
            include: {
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

        if (participation.status !== ParticipationStatus.STARTED) {
            throw new BadRequestException('Can only modify selections in STARTED status');
        }

        // Check if selection already exists
        const existing = await this.prisma.surveySelection.findUnique({
            where: {
                participationId_optionId: {
                    participationId,
                    optionId,
                },
            },
        });

        if (existing) {
            throw new BadRequestException('Option already selected');
        }

        // Verify option belongs to this survey
        const option = await this.prisma.surveyOption.findUnique({
            where: { id: optionId },
        });

        if (!option || option.surveyId !== participation.surveyRelease.survey.id) {
            throw new BadRequestException('Invalid option for this survey');
        }

        // Get current selection count
        const selectionCount = await this.prisma.surveySelection.count({
            where: { participationId },
        });

        // Create hold first (this validates capacity)
        const hold = await this.holdStateMachine.createHold(
            optionId,
            participationId,
            holdExpiryMinutes,
        );

        // Create selection
        const selection = await this.prisma.surveySelection.create({
            data: {
                participationId,
                optionId,
                selectionOrder: selectionCount + 1,
            },
            include: {
                option: true,
            },
        });

        return { selection, hold };
    }

    async removeSelection(
        participationId: string,
        optionId: string,
        userId: string,
    ) {
        const participation = await this.prisma.surveyParticipation.findUnique({
            where: { id: participationId },
        });

        if (!participation) {
            throw new BadRequestException('Participation not found');
        }

        if (participation.userId !== userId) {
            throw new BadRequestException('Not authorized');
        }

        if (participation.status !== ParticipationStatus.STARTED) {
            throw new BadRequestException('Can only modify selections in STARTED status');
        }

        // Find and delete selection
        const selection = await this.prisma.surveySelection.findUnique({
            where: {
                participationId_optionId: {
                    participationId,
                    optionId,
                },
            },
        });

        if (!selection) {
            throw new BadRequestException('Selection not found');
        }

        // Release hold
        const hold = await this.prisma.optionHold.findFirst({
            where: {
                participationId,
                optionId,
                isReleased: false,
            },
        });

        if (hold) {
            await this.holdStateMachine.releaseHold(hold.id);
        }

        // Delete selection
        await this.prisma.surveySelection.delete({
            where: { id: selection.id },
        });

        return { success: true };
    }
}
