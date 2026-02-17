import { RuleParser } from './parser.js';
import { RuleEvaluator } from './evaluator.js';
import { ContextBuilder } from './context.js';
import logger from '../../utils/logger.js';

/**
 * Eligibility Engine - AST-based rule evaluation system
 * 
 * Evaluates complex eligibility rules defined in JSON DSL format.
 * Rules are parsed into an Abstract Syntax Tree (AST) and evaluated
 * against user context.
 */
export class EligibilityEngine {
    constructor(db) {
        this.db = db;
        this.parser = new RuleParser();
        this.evaluator = new RuleEvaluator(db);
        this.contextBuilder = new ContextBuilder(db);
    }

    /**
     * Evaluate eligibility for a user and release
     * 
     * @param {string} userId - User ID
     * @param {string} releaseId - Survey release ID
     * @returns {Promise<EligibilityResult>}
     */
    async evaluate(userId, releaseId) {
        try {
            logger.debug(`Evaluating eligibility for user ${userId}, release ${releaseId}`);

            // 1. Fetch release eligibility rules
            const [rows] = await this.db.query(
                'SELECT eligibility_rules FROM survey_releases WHERE id = ?',
                [releaseId]
            );

            if (!rows[0]) {
                throw new Error('Release not found');
            }

            let rules = rows[0].eligibility_rules;

            if (typeof rules === 'string') {
                try {
                    rules = JSON.parse(rules);
                } catch (e) {
                    logger.error('Failed to parse eligibility rules:', e);
                    rules = {};
                }
            }

            // If no rules defined, allow by default
            if (!rules || Object.keys(rules).length === 0) {
                return {
                    userId,
                    releaseId,
                    decision: 'ALLOW',
                    requirements: [],
                    reason: 'No eligibility rules defined',
                    metadata: {}
                };
            }

            // 2. Build evaluation context
            const context = await this.contextBuilder.build(userId, releaseId);

            // 3. Parse DSL into AST
            const ast = this.parser.parse(rules);

            // 4. Evaluate AST
            const result = await this.evaluator.evaluate(ast, context);

            // 5. Return result
            return {
                userId,
                releaseId,
                decision: result.decision,
                requirements: result.requirements || [],
                reason: result.reason,
                metadata: result.metadata || {},
                evaluatedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Eligibility evaluation failed:', error);
            throw error;
        }
    }

    /**
     * Batch evaluate eligibility for multiple users
     * 
     * @param {string[]} userIds - Array of user IDs
     * @param {string} releaseId - Survey release ID
     * @returns {Promise<EligibilityResult[]>}
     */
    async evaluateBatch(userIds, releaseId) {
        const results = await Promise.all(
            userIds.map(userId => this.evaluate(userId, releaseId))
        );
        return results;
    }

    /**
     * Validate eligibility rules syntax
     * 
     * @param {object} rules - Eligibility rules DSL
     * @returns {object} Validation result
     */
    validateRules(rules) {
        try {
            this.parser.parse(rules);
            return { valid: true, errors: [] };
        } catch (error) {
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }
}

/**
 * @typedef {object} EligibilityResult
 * @property {string} userId - User ID
 * @property {string} releaseId - Release ID
 * @property {string} decision - ALLOW | DENY | ALLOW_WITH_REQUIREMENTS | WAITLIST | ROUTE
 * @property {Array} requirements - Required actions before participation
 * @property {string} reason - Human-readable reason for decision
 * @property {object} metadata - Additional metadata
 * @property {string} evaluatedAt - ISO timestamp of evaluation
 */

export default EligibilityEngine;
