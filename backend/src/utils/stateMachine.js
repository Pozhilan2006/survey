import logger from './logger.js';

/**
 * State Machine Enforcement
 * 
 * Defines and enforces allowed state transitions for surveys and participations.
 * Prevents invalid state changes that could corrupt data integrity.
 */

/**
 * Allowed state transitions
 */
const ALLOWED_TRANSITIONS = {
    // Survey status transitions
    'SURVEY': {
        'DRAFT': ['ACTIVE'],
        'ACTIVE': ['CLOSED'],
        'CLOSED': []
    },

    // Participation status transitions
    'PARTICIPATION': {
        'STARTED': ['SUBMITTED', 'ABANDONED'],
        'SUBMITTED': ['APPROVED', 'REJECTED'],
        'APPROVED': [],
        'REJECTED': [],
        'ABANDONED': []
    }
};

/**
 * Validate state transition
 * @param {string} entityType - Entity type ('SURVEY' or 'PARTICIPATION')
 * @param {string} currentState - Current state
 * @param {string} newState - Desired new state
 * @throws {Error} If transition is not allowed
 */
export function validateTransition(entityType, currentState, newState) {
    if (!ALLOWED_TRANSITIONS[entityType]) {
        const error = new Error(`Unknown entity type: ${entityType}`);
        error.code = 'INVALID_ENTITY_TYPE';
        throw error;
    }

    const allowedStates = ALLOWED_TRANSITIONS[entityType][currentState];

    if (!allowedStates) {
        const error = new Error(`Unknown state: ${currentState} for ${entityType}`);
        error.code = 'UNKNOWN_STATE';
        throw error;
    }

    if (!allowedStates.includes(newState)) {
        const error = new Error(
            `Invalid transition: ${entityType} cannot transition from ${currentState} to ${newState}. ` +
            `Allowed transitions: ${allowedStates.length > 0 ? allowedStates.join(', ') : 'none'}`
        );
        error.code = 'INVALID_TRANSITION';
        error.currentState = currentState;
        error.attemptedState = newState;
        error.allowedStates = allowedStates;
        throw error;
    }

    logger.debug(`State transition validated: ${entityType} ${currentState} → ${newState}`);
}

/**
 * Get allowed next states for current state
 * @param {string} entityType - Entity type
 * @param {string} currentState - Current state
 * @returns {string[]} Array of allowed next states
 */
export function getAllowedNextStates(entityType, currentState) {
    if (!ALLOWED_TRANSITIONS[entityType]) {
        return [];
    }

    return ALLOWED_TRANSITIONS[entityType][currentState] || [];
}

/**
 * Check if transition is allowed
 * @param {string} entityType - Entity type
 * @param {string} currentState - Current state
 * @param {string} newState - Desired new state
 * @returns {boolean} True if transition is allowed
 */
export function isTransitionAllowed(entityType, currentState, newState) {
    try {
        validateTransition(entityType, currentState, newState);
        return true;
    } catch (error) {
        return false;
    }
}

export default {
    validateTransition,
    getAllowedNextStates,
    isTransitionAllowed,
    ALLOWED_TRANSITIONS
};
