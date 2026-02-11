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
 * Get all surveys
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
 * Get survey by ID
 */
export const getSurveyById = async (surveyId) => {
    try {
        const surveys = await getSurveys();
        const survey = surveys.find(s => s.id === surveyId);
        if (!survey) {
            throw new Error('Survey not found');
        }
        return survey;
    } catch (error) {
        console.error('Failed to get survey:', error);
        throw error;
    }
};

/**
 * Submit survey
 * @param {string} surveyId - Survey ID
 * @param {string} userId - User ID
 * @param {string[]} selectedOptionIds - Selected option IDs
 */
export const submitSurvey = async (surveyId, userId, selectedOptionIds) => {
    try {
        const response = await fetch(`${API_BASE_URL}/surveys/${surveyId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                selectedOptionIds
            })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Failed to submit survey:', error);
        throw error;
    }
};
