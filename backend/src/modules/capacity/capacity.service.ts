import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CapacityService {
    constructor(private prisma: PrismaService) { }

    async getCapacityForRelease(releaseId: string) {
        const capacities = await this.prisma.optionCapacity.findMany({
            where: { surveyReleaseId: releaseId },
            include: {
                option: {
                    select: {
                        id: true,
                        optionName: true,
                    },
                },
            },
        });

        const result = await Promise.all(
            capacities.map(async (cap) => {
                const activeHolds = await this.prisma.optionHold.count({
                    where: {
                        optionId: cap.optionId,
                        isReleased: false,
                        expiresAt: { gt: new Date() },
                    },
                });

                return {
                    optionId: cap.optionId,
                    optionName: cap.option.optionName,
                    maxCapacity: cap.maxCapacity,
                    currentUtilization: cap.currentUtilization,
                    activeHolds,
                    available: cap.maxCapacity - cap.currentUtilization - activeHolds,
                };
            })
        );

        return result;
    }
}
