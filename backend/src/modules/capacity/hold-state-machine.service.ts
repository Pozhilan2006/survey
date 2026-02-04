import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class HoldStateMachine {
    constructor(private prisma: PrismaService) { }

    async createHold(
        optionId: string,
        participationId: string,
        expiryMinutes: number,
    ) {
        return this.prisma.$transaction(async (tx) => {
            // Lock the capacity row for update
            const capacity = await tx.$queryRaw<any[]>(
                Prisma.sql`
          SELECT * FROM "OptionCapacity" 
          WHERE "optionId" = ${optionId} 
          FOR UPDATE
        `
            );

            if (!capacity || capacity.length === 0) {
                throw new BadRequestException('Option capacity not configured');
            }

            const cap = capacity[0];

            // Check if capacity available
            const activeHolds = await tx.optionHold.count({
                where: {
                    optionId,
                    isReleased: false,
                    expiresAt: { gt: new Date() },
                },
            });

            const totalReserved = cap.currentUtilization + activeHolds;

            if (totalReserved >= cap.maxCapacity) {
                throw new ConflictException('Option capacity exceeded');
            }

            // Create hold
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

            const hold = await tx.optionHold.create({
                data: {
                    optionId,
                    participationId,
                    expiresAt,
                },
            });

            return hold;
        });
    }

    async releaseHold(holdId: string) {
        return this.prisma.optionHold.update({
            where: { id: holdId },
            data: { isReleased: true },
        });
    }

    async convertHoldsToUtilization(participationId: string) {
        return this.prisma.$transaction(async (tx) => {
            const holds = await tx.optionHold.findMany({
                where: {
                    participationId,
                    isReleased: false,
                },
            });

            for (const hold of holds) {
                // Lock capacity row
                await tx.$executeRaw(
                    Prisma.sql`
            UPDATE "OptionCapacity" 
            SET "currentUtilization" = "currentUtilization" + 1 
            WHERE "optionId" = ${hold.optionId}
          `
                );

                // Release hold
                await tx.optionHold.update({
                    where: { id: hold.id },
                    data: { isReleased: true },
                });
            }
        });
    }

    async expireHolds() {
        const now = new Date();

        return this.prisma.optionHold.updateMany({
            where: {
                expiresAt: { lt: now },
                isReleased: false,
            },
            data: {
                isReleased: true,
            },
        });
    }
}
