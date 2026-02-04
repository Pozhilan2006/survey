import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipationStatus } from '@prisma/client';

export interface EligibilityResult {
    isEligible: boolean;
    gateType?: 'HARD' | 'SOFT';
    denyReason?: string;
    prerequisiteDetails?: any;
}

@Injectable()
export class EligibilityService {
    constructor(private prisma: PrismaService) { }

    async checkSurveyEligibility(
        userId: string,
        surveyReleaseId: string,
    ): Promise<EligibilityResult> {
        const release = await this.prisma.surveyRelease.findUnique({
            where: { id: surveyReleaseId },
            include: {
                group: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
                survey: true,
            },
        });

        if (!release) {
            return {
                isEligible: false,
                denyReason: 'Survey release not found',
            };
        }

        // Check group membership
        if (release.group.members.length === 0) {
            return {
                isEligible: false,
                gateType: 'HARD',
                denyReason: 'You are not a member of the required group',
            };
        }

        // Check prerequisite surveys (based on release order)
        if (release.releaseOrder > 1) {
            const prerequisiteRelease = await this.prisma.surveyRelease.findFirst({
                where: {
                    groupId: release.groupId,
                    releaseOrder: release.releaseOrder - 1,
                },
                include: {
                    survey: true,
                },
            });

            if (prerequisiteRelease) {
                const prerequisiteParticipation = await this.prisma.surveyParticipation.findUnique({
                    where: {
                        userId_surveyReleaseId: {
                            userId,
                            surveyReleaseId: prerequisiteRelease.id,
                        },
                    },
                });

                if (!prerequisiteParticipation || prerequisiteParticipation.status !== ParticipationStatus.APPROVED) {
                    return {
                        isEligible: false,
                        gateType: 'SOFT',
                        denyReason: 'You must complete the prerequisite survey first',
                        prerequisiteDetails: {
                            surveyName: prerequisiteRelease.survey.name,
                            releaseId: prerequisiteRelease.id,
                            currentStatus: prerequisiteParticipation?.status || 'NOT_STARTED',
                        },
                    };
                }
            }
        }

        return {
            isEligible: true,
        };
    }
}
