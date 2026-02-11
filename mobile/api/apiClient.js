// Real API Client for Mobile App

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
 * Get surveys for current user (calls public surveys endpoint for now)
 * GET /api/v1/surveys
 */
export const getMySurveys = async () => {
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
 * Get detailed survey by ID
 * GET /api/v1/surveys
 */
export const getSurveyById = async (surveyId) => {
    try {
        // Optimally we would have a specific endpoint /surveys/:id
        // But the current backend provides surveys list with options in /surveys
        // So we filter client-side for now, or use the same endpoint if it supported ID filtering
        // We will fetch all and find the one we need since the list is small
        const surveys = await getMySurveys();
        const survey = surveys.find(s => s.id === surveyId);
        if (!survey) {
            throw new Error('Survey not found');
        }
        return survey;
    } catch (error) {
        console.error('API Call Failed:', error);
        throw error;
    }
};

/**
 * Submit survey responses
 * Placeholder for future implementation
 */
export const submitSurvey = async (surveyId, responses) => {
    // TODO: Connect to submission API when available
    console.warn('Submission API not yet available');
    throw new Error('Submission not yet implemented');
};
