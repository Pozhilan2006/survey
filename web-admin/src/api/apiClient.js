// Real API Client for Web Admin

const API_BASE_URL = 'http://localhost:3000/api/v1';

/**
 * Helper to handle fetch responses
 */
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network response was not ok' }));
        throw new Error(error.message || `API Error: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Get all surveys
 * GET /api/v1/surveys
 */
export const getSurveys = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/surveys`);
        const data = await handleResponse(response);
        return data.surveys || [];
    } catch (error) {
        console.error('API Call Failed:', error);
        throw error;
    }
};

/**
 * Get dashboard stats (aggregated from surveys for now)
 */
export const getDashboardStats = async () => {
    try {
        const surveys = await getSurveys();
        return {
            totalSurveys: surveys.length,
            activeSurveys: surveys.filter(s => s.status === 'ACTIVE').length,
            completedSurveys: surveys.filter(s => s.status === 'COMPLETED').length,
            draftSurveys: surveys.filter(s => s.status === 'DRAFT').length,
            // Placeholders for data not yet available
            pendingApprovals: 0,
            activeUsers: 0
        };
    } catch (error) {
        console.error('Failed to get stats:', error);
        throw error;
    }
};

/**
 * Get all submissions
 * GET /api/v1/admin/submissions
 */
export const getSubmissions = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/submissions`);
        const data = await handleResponse(response);
        return data.submissions || [];
    } catch (error) {
        console.error('Failed to get submissions:', error);
        throw error;
    }
};

/**
 * Approve a submission
 * POST /api/v1/admin/submissions/:id/approve
 */
export const approveSubmission = async (participationId, adminUserId = 'admin-placeholder') => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/submissions/${participationId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUserId })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Failed to approve submission:', error);
        throw error;
    }
};

/**
 * Reject a submission
 * POST /api/v1/admin/submissions/:id/reject
 */
export const rejectSubmission = async (participationId, adminUserId = 'admin-placeholder') => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/submissions/${participationId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUserId })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Failed to reject submission:', error);
        throw error;
    }
};

/**
 * Get audit logs
 * GET /api/v1/admin/audit-logs
 */
export const getAuditLogs = async (limit = 100) => {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/audit-logs?limit=${limit}`);
        const data = await handleResponse(response);
        return data.logs || [];
    } catch (error) {
        console.error('Failed to get audit logs:', error);
        throw error;
    }
};

// Placeholder functions for features not yet implemented
export const getUsers = async () => [];
