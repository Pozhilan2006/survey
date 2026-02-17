export const PERMISSIONS = {
    // Survey permissions
    VIEW_SURVEYS: ['ADMIN', 'STUDENT', 'APPROVER'],
    CREATE_SURVEY: ['ADMIN'],
    EDIT_SURVEY: ['ADMIN'],
    DELETE_SURVEY: ['ADMIN'],

    // Hold permissions
    CREATE_HOLD: ['STUDENT'],
    RELEASE_HOLD: ['STUDENT', 'ADMIN'],

    // Submission permissions
    SUBMIT_SURVEY: ['STUDENT'],
    VIEW_OWN_SUBMISSIONS: ['STUDENT'],
    VIEW_ALL_SUBMISSIONS: ['ADMIN', 'APPROVER'],

    // Approval permissions
    APPROVE_SUBMISSION: ['ADMIN', 'APPROVER'],
    REJECT_SUBMISSION: ['ADMIN', 'APPROVER'],

    // User management
    MANAGE_USERS: ['ADMIN'],
    VIEW_AUDIT_LOGS: ['ADMIN', 'APPROVER']
};

export const hasPermission = (userRole, permission) => {
    return PERMISSIONS[permission]?.includes(userRole) || false;
};

export const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({
                error: { code: 'CHECK_PERMISSION_CALLED', message: 'Authentication required (DEBUG)' }
            });
        }

        if (!hasPermission(req.user.role, permission)) {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
            });
        }

        next();
    };
};
