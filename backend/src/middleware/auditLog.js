import { query } from '../config/database.js';
import logger from '../utils/logger.js';

export async function auditLog({
    eventType,
    entityType,
    entityId,
    userId,
    action,
    oldState = null,
    newState = null,
    metadata = {},
    ipAddress = null,
    userAgent = null
}) {
    try {
        await query(
            `INSERT INTO audit_events 
       (event_type, entity_type, entity_id, user_id, action, old_state, new_state, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                eventType,
                entityType,
                entityId,
                userId,
                action,
                oldState ? JSON.stringify(oldState) : null,
                newState ? JSON.stringify(newState) : null,
                JSON.stringify(metadata),
                ipAddress,
                userAgent
            ]
        );
    } catch (error) {
        logger.error('Failed to write audit log:', error);
        // Don't throw - audit logging should not break the main flow
    }
}

export function auditMiddleware(req, res, next) {
    // Attach audit helper to request
    req.audit = (data) => auditLog({
        ...data,
        userId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    next();
}

export default { auditLog, auditMiddleware };
