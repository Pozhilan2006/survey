import logger from '../utils/logger.js';

/**
 * Eligibility Engine
 * 
 * Evaluates user eligibility based on survey release rules.
 * Supports: IN_GROUP, YEAR_EQUALS, DEPARTMENT_EQUALS, AND, OR
 * 
 * TODO: Phase 3 - Implement AST-based DSL for complex expressions
 */

/**
 * Evaluate eligibility rule
 * @param {object} rule - Rule configuration
 * @param {object} userContext - User context (year, department, groups, etc.)
 * @returns {object} { eligible: boolean, reason: string }
 */
export function evaluateEligibility(rule, userContext) {
    if (!rule) {
        return { eligible: true, reason: 'No eligibility rules defined' };
    }

    try {
        return evaluateRule(rule, userContext);
    } catch (error) {
        logger.error('Eligibility evaluation error:', error);
        return {
            eligible: false,
            reason: 'Error evaluating eligibility rules'
        };
    }
}

/**
 * Recursively evaluate a rule
 * @param {object} rule - Rule to evaluate
 * @param {object} userContext - User context
 * @returns {object} { eligible: boolean, reason: string }
 */
function evaluateRule(rule, userContext) {
    const { type } = rule;

    switch (type) {
        case 'IN_GROUP':
            return evaluateInGroup(rule, userContext);

        case 'YEAR_EQUALS':
            return evaluateYearEquals(rule, userContext);

        case 'DEPARTMENT_EQUALS':
            return evaluateDepartmentEquals(rule, userContext);

        case 'AND':
            return evaluateAnd(rule, userContext);

        case 'OR':
            return evaluateOr(rule, userContext);

        default:
            logger.warn(`Unknown rule type: ${type}`);
            return {
                eligible: false,
                reason: `Unknown rule type: ${type}`
            };
    }
}

/**
 * Evaluate IN_GROUP rule
 * Checks if user belongs to specified group
 */
function evaluateInGroup(rule, userContext) {
    const { value: requiredGroup } = rule;
    const userGroups = userContext.groups || [];

    const eligible = userGroups.includes(requiredGroup);

    return {
        eligible,
        reason: eligible
            ? `User is in group: ${requiredGroup}`
            : `User must be in group: ${requiredGroup}`
    };
}

/**
 * Evaluate YEAR_EQUALS rule
 * Checks if user's year matches required year
 */
function evaluateYearEquals(rule, userContext) {
    const { value: requiredYear } = rule;
    const userYear = userContext.year;

    const eligible = userYear === requiredYear;

    return {
        eligible,
        reason: eligible
            ? `User is in year ${requiredYear}`
            : `User must be in year ${requiredYear} (current: ${userYear || 'unknown'})`
    };
}

/**
 * Evaluate DEPARTMENT_EQUALS rule
 * Checks if user's department matches required department
 */
function evaluateDepartmentEquals(rule, userContext) {
    const { value: requiredDept } = rule;
    const userDept = userContext.department;

    const eligible = userDept === requiredDept;

    return {
        eligible,
        reason: eligible
            ? `User is in department: ${requiredDept}`
            : `User must be in department: ${requiredDept} (current: ${userDept || 'unknown'})`
    };
}

/**
 * Evaluate AND rule
 * All sub-rules must pass
 */
function evaluateAnd(rule, userContext) {
    const { rules: subRules } = rule;

    if (!Array.isArray(subRules) || subRules.length === 0) {
        return {
            eligible: true,
            reason: 'No sub-rules to evaluate'
        };
    }

    const results = subRules.map(subRule => evaluateRule(subRule, userContext));
    const allEligible = results.every(r => r.eligible);

    if (allEligible) {
        return {
            eligible: true,
            reason: 'All requirements met'
        };
    }

    // Find first failing rule
    const failedRule = results.find(r => !r.eligible);
    return {
        eligible: false,
        reason: failedRule.reason
    };
}

/**
 * Evaluate OR rule
 * At least one sub-rule must pass
 */
function evaluateOr(rule, userContext) {
    const { rules: subRules } = rule;

    if (!Array.isArray(subRules) || subRules.length === 0) {
        return {
            eligible: true,
            reason: 'No sub-rules to evaluate'
        };
    }

    const results = subRules.map(subRule => evaluateRule(subRule, userContext));
    const anyEligible = results.some(r => r.eligible);

    if (anyEligible) {
        const passedRule = results.find(r => r.eligible);
        return {
            eligible: true,
            reason: passedRule.reason
        };
    }

    // Combine all failure reasons
    const reasons = results.map(r => r.reason).join(' OR ');
    return {
        eligible: false,
        reason: `Must meet at least one: ${reasons}`
    };
}

/**
 * Extract user context from user record
 * @param {object} user - User database record
 * @returns {object} User context for eligibility evaluation
 */
export function buildUserContext(user) {
    const metadata = typeof user.metadata === 'string'
        ? JSON.parse(user.metadata)
        : (user.metadata || {});

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
        year: metadata.year || null,
        department: metadata.department || null,
        groups: metadata.groups || [],
        // Add more fields as needed
    };
}

export default {
    evaluateEligibility,
    buildUserContext
};
