import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async logEvent(params: {
        entityType: string;
        entityId: string;
        userId?: string;
        eventType: string;
        oldState?: any;
        newState?: any;
        metadata?: any;
    }) {
        return this.prisma.auditEvent.create({
            data: {
                entityType: params.entityType,
                entityId: params.entityId,
                userId: params.userId,
                eventType: params.eventType,
                oldState: params.oldState || null,
                newState: params.newState || null,
                metadata: params.metadata || null,
            },
        });
    }
}
