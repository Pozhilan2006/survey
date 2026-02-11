import { auditLog } from '../../middleware/auditLog.js';
import logger from '../../utils/logger.js';

/**
 * State Machine Framework
 * 
 * Base class for implementing state machines that enforce valid
 * state transitions with guards, hooks, and audit logging.
 */
export class StateMachine {
    /**
     * @param {object} definition - State machine definition
     * @param {string} definition.initialState - Initial state
     * @param {Array<string>} definition.states - Valid states
     * @param {Array<Transition>} definition.transitions - Valid transitions
     */
    constructor(definition) {
        this.states = definition.states;
        this.transitions = definition.transitions;
        this.initialState = definition.initialState;
        this.entityType = definition.entityType || 'UNKNOWN';

        // Validate definition
        this.validateDefinition();
    }

    /**
     * Validate state machine definition
     */
    validateDefinition() {
        if (!this.initialState) {
            throw new Error('State machine must have an initialState');
        }

        if (!this.states || this.states.length === 0) {
            throw new Error('State machine must have at least one state');
        }

        if (!this.states.includes(this.initialState)) {
            throw new Error('Initial state must be in states array');
        }

        if (!this.transitions || this.transitions.length === 0) {
            throw new Error('State machine must have at least one transition');
        }

        // Validate all transitions reference valid states
        for (const transition of this.transitions) {
            if (!this.states.includes(transition.from)) {
                throw new Error(`Invalid transition: "${transition.from}" is not a valid state`);
            }
            if (!this.states.includes(transition.to)) {
                throw new Error(`Invalid transition: "${transition.to}" is not a valid state`);
            }
        }
    }

    /**
     * Validate a state transition
     * 
     * @param {string} currentState - Current state
     * @param {string} targetState - Target state
     * @param {object} context - Transition context
     * @returns {Transition} Valid transition object
     * @throws {Error} If transition is invalid
     */
    validateTransition(currentState, targetState, context) {
        // Find matching transition
        const transition = this.transitions.find(
            t => t.from === currentState && t.to === targetState
        );

        if (!transition) {
            throw new Error(
                `Invalid transition from "${currentState}" to "${targetState}"`
            );
        }

        // Check guard conditions
        if (transition.guard) {
            const guardResult = transition.guard(context);

            if (!guardResult.allowed) {
                throw new Error(
                    `Transition guard failed: ${guardResult.reason || 'Guard condition not met'}`
                );
            }
        }

        return transition;
    }

    /**
     * Execute a state transition
     * 
     * @param {object} entity - Entity to transition
     * @param {string} targetState - Target state
     * @param {object} context - Transition context
     * @param {object} db - Database client (for transactions)
     * @returns {Promise<object>} Updated entity
     */
    async executeTransition(entity, targetState, context, db) {
        const currentState = entity.state;

        logger.info(
            `Executing transition: ${this.entityType} ${entity.id} from ${currentState} to ${targetState}`
        );

        try {
            // 1. Validate transition
            const transition = this.validateTransition(currentState, targetState, context);

            // 2. Execute pre-transition hooks
            if (transition.before) {
                logger.debug(`Executing before hook for ${currentState} -> ${targetState}`);
                await transition.before(entity, context, db);
            }

            // 3. Update entity state
            const updated = await this.updateEntityState(entity, targetState, db);

            // 4. Execute post-transition hooks
            if (transition.after) {
                logger.debug(`Executing after hook for ${currentState} -> ${targetState}`);
                await transition.after(updated, context, db);
            }

            // 5. Audit log the transition
            await this.auditTransition(entity, currentState, targetState, context, db);

            logger.info(
                `Transition completed: ${this.entityType} ${entity.id} is now ${targetState}`
            );

            return updated;

        } catch (error) {
            logger.error(
                `Transition failed: ${this.entityType} ${entity.id} from ${currentState} to ${targetState}`,
                error
            );
            throw error;
        }
    }

    /**
     * Update entity state in database
     * Must be implemented by subclasses
     * 
     * @param {object} entity - Entity to update
     * @param {string} newState - New state
     * @param {object} db - Database client
     * @returns {Promise<object>} Updated entity
     */
    async updateEntityState(entity, newState, db) {
        throw new Error('updateEntityState must be implemented by subclass');
    }

    /**
     * Audit log the state transition
     * 
     * @param {object} entity - Entity
     * @param {string} fromState - Previous state
     * @param {string} toState - New state
     * @param {object} context - Transition context
     * @param {object} db - Database client
     */
    async auditTransition(entity, fromState, toState, context, db) {
        await auditLog({
            eventType: 'STATE_TRANSITION',
            entityType: this.entityType,
            entityId: entity.id,
            userId: context.userId,
            action: `${fromState} -> ${toState}`,
            oldState: { state: fromState },
            newState: { state: toState },
            metadata: context.metadata || {}
        });
    }

    /**
     * Get all valid next states from current state
     * 
     * @param {string} currentState - Current state
     * @returns {Array<string>} Valid next states
     */
    getValidNextStates(currentState) {
        return this.transitions
            .filter(t => t.from === currentState)
            .map(t => t.to);
    }

    /**
     * Check if a transition is valid
     * 
     * @param {string} fromState - Current state
     * @param {string} toState - Target state
     * @returns {boolean} True if transition is valid
     */
    isValidTransition(fromState, toState) {
        return this.transitions.some(
            t => t.from === fromState && t.to === toState
        );
    }
}

/**
 * @typedef {object} Transition
 * @property {string} from - Source state
 * @property {string} to - Target state
 * @property {Function} [guard] - Guard function that returns {allowed: boolean, reason?: string}
 * @property {Function} [before] - Hook executed before state update
 * @property {Function} [after] - Hook executed after state update
 */

export default StateMachine;
