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
    // For now we calculate stats from getSurveys since backend doesn't have a stats endpoint yet
    // This connects frontend to real data without needing backend changes
    try {
        const surveys = await getSurveys();
        return {
            totalSurveys: surveys.length,
            activeSurveys: surveys.filter(s => s.status === 'ACTIVE').length,
            // Placeholders for data not yet available in minimal API
            pendingApprovals: 0,
            activeUsers: 0,
            completedSurveys: 0
        };
    } catch (error) {
        console.error('Failed to get stats:', error);
        throw error;
    }
};

// ... other exports kept as mocks or stubs if needed, but for this task we focused on Surveys
// Keeping other functions as errors or empty to prevent crashes if called
export const getApprovals = async () => [];
export const getUsers = async () => [];
export const getAuditLogs = async () => [];

