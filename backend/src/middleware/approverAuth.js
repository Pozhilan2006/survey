/**
 * Approver Authentication Middleware
 * 
 * Restricts access to approver-specific routes
 */

/**
 * Require APPROVER or ADMIN role
 * Allows both approvers and admins to access approval endpoints
 */
export const requireApprover = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated'
        });
    }

    if (req.user.role !== 'APPROVER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'Approver access required'
        });
    }

    next();
};

/**
 * Require APPROVER role only
 * Restricts access to approvers only (not admins)
 */
export const approverOnly = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated'
        });
    }

    if (req.user.role !== 'APPROVER') {
        return res.status(403).json({
            success: false,
            error: 'Approver-only access'
        });
    }

    next();
};

/**
 * Prevent approvers from accessing admin routes
 * Used to protect survey modification endpoints
 */
export const preventApproverAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated'
        });
    }

    if (req.user.role === 'APPROVER') {
        return res.status(403).json({
            success: false,
            error: 'Approvers cannot modify surveys. Contact an administrator.'
        });
    }

    next();
};
