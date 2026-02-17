import { ELIGIBILITY_DECISIONS } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Rule Evaluator - Evaluates AST against user context
 * 
 * Implements all eligibility operators and returns evaluation results.
 */
export class RuleEvaluator {
    constructor(db) {
        this.db = db;

        // Map of operators to evaluation functions
        this.operators = {
            AND: this.evaluateAND.bind(this),
            OR: this.evaluateOR.bind(this),
            NOT: this.evaluateNOT.bind(this),
            IN_GROUP: this.evaluateInGroup.bind(this),
            NOT_IN_GROUP: this.evaluateNotInGroup.bind(this),
            SURVEY_COMPLETED: this.evaluateSurveyCompleted.bind(this),
            SURVEY_APPROVED: this.evaluateSurveyApproved.bind(this),
            SURVEY_ALLOCATED: this.evaluateSurveyAllocated.bind(this),
            DOCUMENT_VERIFIED: this.evaluateDocumentVerified.bind(this),
            DOCUMENT_UPLOADED: this.evaluateDocumentUploaded.bind(this),
            TIME_WINDOW: this.evaluateTimeWindow.bind(this),
            BEFORE_TIME: this.evaluateBeforeTime.bind(this),
            AFTER_TIME: this.evaluateAfterTime.bind(this),
            QUOTA_AVAILABLE: this.evaluateQuotaAvailable.bind(this),
            HAS_ROLE: this.evaluateHasRole.bind(this),
            METADATA_MATCH: this.evaluateMetadataMatch.bind(this),
            YEAR_EQUALS: this.evaluateYearEquals.bind(this),
            DEPARTMENT_EQUALS: this.evaluateDepartmentEquals.bind(this),
            CUSTOM: this.evaluateCustom.bind(this)
        };
    }

    async evaluateYearEquals(node, context) {
        // Handle both string and number comparison safely
        const userYear = String(context.user.metadata.year || '');
        const targetYear = String(node.value);

        return userYear === targetYear
            ? this.allowResult(`Year matches: ${node.value}`)
            : this.denyResult(`Year does not match: required ${node.value}, got ${userYear}`);
    }

    async evaluateDepartmentEquals(node, context) {
        const userDept = (context.user.metadata.department || '').toUpperCase();
        const targetDept = (node.value || '').toUpperCase();

        return userDept === targetDept
            ? this.allowResult(`Department matches: ${node.value}`)
            : this.denyResult(`Department does not match: required ${node.value}, got ${userDept}`);
    }

    /**
     * Evaluate AST node against context
     */
    async evaluate(node, context) {
        if (!node || !node.rule) {
            return this.denyResult('Invalid rule structure');
        }

        const operator = this.operators[node.rule];
        if (!operator) {
            throw new Error(`Unknown rule operator: ${node.rule}`);
        }

        try {
            return await operator(node, context);
        } catch (error) {
            logger.error(`Error evaluating ${node.rule}:`, error);
            return this.denyResult(`Evaluation error: ${error.message}`);
        }
    }

    // ... (Logical/Group/Survey/Document/Time/Role/Metadata/Custom operators unchanged)
    // I need to preserve them. Since write_to_file overwrites, I must include all. 
    // I will try to use replace_file_content for the QUOTA operator to be safe and avoid large file overwrite if possible.
    // But I noticed usage of `this.db.query` which implies I should verify if `db` is pool or wrapper.
    // If it's `getPool()` result, it's a pool, so returns [rows].
    // I'll stick to replace_file_content for precision on the Quota method.

    async evaluateAND(node, context) {
        const results = [];

        for (const condition of node.conditions) {
            const result = await this.evaluate(condition, context);
            results.push(result);

            // Short-circuit on first DENY
            if (result.decision === ELIGIBILITY_DECISIONS.DENY) {
                return {
                    decision: ELIGIBILITY_DECISIONS.DENY,
                    reason: result.reason,
                    failedCondition: condition,
                    metadata: result.metadata
                };
            }
        }

        // Collect all requirements from all conditions
        const allRequirements = results.flatMap(r => r.requirements || []);

        return {
            decision: allRequirements.length > 0
                ? ELIGIBILITY_DECISIONS.ALLOW_WITH_REQUIREMENTS
                : ELIGIBILITY_DECISIONS.ALLOW,
            requirements: allRequirements,
            reason: 'All conditions satisfied',
            metadata: {}
        };
    }

    async evaluateOR(node, context) {
        const errors = [];

        for (const condition of node.conditions) {
            const result = await this.evaluate(condition, context);

            // Short-circuit on first ALLOW or ALLOW_WITH_REQUIREMENTS
            if (result.decision === ELIGIBILITY_DECISIONS.ALLOW ||
                result.decision === ELIGIBILITY_DECISIONS.ALLOW_WITH_REQUIREMENTS) {
                return result;
            }

            errors.push(result.reason);
        }

        return this.denyResult(`None of the OR conditions satisfied: ${errors.join(', ')}`);
    }

    async evaluateNOT(node, context) {
        const result = await this.evaluate(node.condition, context);

        if (result.decision === ELIGIBILITY_DECISIONS.DENY) {
            return this.allowResult('NOT condition satisfied');
        } else {
            return this.denyResult('NOT condition failed');
        }
    }

    async evaluateInGroup(node, context) {
        const isInGroup = context.groups.some(g =>
            g.name === node.group || g.id === node.groupId
        );

        return isInGroup
            ? this.allowResult(`User is in group: ${node.group || node.groupId}`)
            : this.denyResult(`User not in required group: ${node.group || node.groupId}`);
    }

    async evaluateNotInGroup(node, context) {
        const isInGroup = context.groups.some(g =>
            g.name === node.group || g.id === node.groupId
        );

        return !isInGroup
            ? this.allowResult(`User is not in group: ${node.group || node.groupId}`)
            : this.denyResult(`User is in excluded group: ${node.group || node.groupId}`);
    }

    async evaluateSurveyCompleted(node, context) {
        const completed = context.completedSurveys.some(
            s => s.release_id === node.surveyReleaseId &&
                ['SUBMITTED', 'APPROVED', 'ALLOCATED'].includes(s.state)
        );

        return completed
            ? this.allowResult('Prerequisite survey completed')
            : this.denyResult('Prerequisite survey not completed');
    }

    async evaluateSurveyApproved(node, context) {
        const approved = context.completedSurveys.some(
            s => s.release_id === node.surveyReleaseId &&
                s.approved_at !== null
        );

        return approved
            ? this.allowResult('Prerequisite survey approved')
            : this.denyResult('Prerequisite survey not approved');
    }

    async evaluateSurveyAllocated(node, context) {
        const allocated = context.completedSurveys.some(
            s => s.release_id === node.surveyReleaseId &&
                s.state === 'ALLOCATED'
        );

        return allocated
            ? this.allowResult('Prerequisite survey allocated')
            : this.denyResult('Prerequisite survey not allocated');
    }

    async evaluateDocumentVerified(node, context) {
        const verified = context.documents.some(
            d => d.document_type === node.documentType &&
                d.state === 'VERIFIED' &&
                (!node.optionId || d.option_id === node.optionId)
        );

        return verified
            ? this.allowResult(`Document verified: ${node.documentType}`)
            : this.requirementResult(
                'Document verification required',
                [{
                    type: 'DOCUMENT_UPLOAD',
                    documentType: node.documentType,
                    optionId: node.optionId
                }]
            );
    }

    async evaluateDocumentUploaded(node, context) {
        const uploaded = context.documents.some(
            d => d.document_type === node.documentType &&
                (!node.optionId || d.option_id === node.optionId)
        );

        return uploaded
            ? this.allowResult(`Document uploaded: ${node.documentType}`)
            : this.requirementResult(
                'Document upload required',
                [{
                    type: 'DOCUMENT_UPLOAD',
                    documentType: node.documentType,
                    optionId: node.optionId
                }]
            );
    }

    async evaluateTimeWindow(node, context) {
        const now = context.currentTime;
        const start = node.start;
        const end = node.end;

        if (now >= start && now <= end) {
            return this.allowResult('Within time window');
        } else if (now < start) {
            return this.denyResult(`Survey opens at ${start.toISOString()}`);
        } else {
            return this.denyResult('Survey has closed');
        }
    }

    async evaluateBeforeTime(node, context) {
        const now = context.currentTime;
        const time = node.time;

        return now < time
            ? this.allowResult('Before specified time')
            : this.denyResult(`Must be before ${time.toISOString()}`);
    }

    async evaluateAfterTime(node, context) {
        const now = context.currentTime;
        const time = node.time;

        return now >= time
            ? this.allowResult('After specified time')
            : this.denyResult(`Must be after ${time.toISOString()}`);
    }

    async evaluateQuotaAvailable(node, context) {
        // Check if user's category has quota available
        const userGroupIds = context.groups.map(g => g.id);

        const [rows] = await this.db.query(
            `SELECT SUM(quota - current_filled - current_held) as available
       FROM option_quota_buckets
       WHERE category_group_id IN (?)
       ${node.optionId ? 'AND capacity_id IN (SELECT id FROM option_capacity WHERE option_id = ?)' : ''}`,
            node.optionId ? [userGroupIds, node.optionId] : [userGroupIds]
        );

        const available = parseInt(rows[0]?.available || 0);

        if (available >= node.minAvailable) {
            return this.allowResult('Quota available');
        } else {
            return {
                decision: ELIGIBILITY_DECISIONS.WAITLIST,
                reason: 'No quota available, eligible for waitlist',
                requirements: [],
                metadata: { available }
            };
        }
    }

    async evaluateHasRole(node, context) {
        return context.user.role === node.role
            ? this.allowResult(`User has role: ${node.role}`)
            : this.denyResult(`User does not have required role: ${node.role}`);
    }

    async evaluateMetadataMatch(node, context) {
        const metadata = context.user.metadata || {};
        const value = metadata[node.key];

        let matches = false;

        switch (node.operator) {
            case 'equals':
                matches = value === node.value;
                break;
            case 'contains':
                matches = String(value).includes(node.value);
                break;
            case 'gt':
                matches = Number(value) > Number(node.value);
                break;
            case 'lt':
                matches = Number(value) < Number(node.value);
                break;
            case 'gte':
                matches = Number(value) >= Number(node.value);
                break;
            case 'lte':
                matches = Number(value) <= Number(node.value);
                break;
            default:
                matches = value === node.value;
        }

        return matches
            ? this.allowResult(`Metadata matches: ${node.key} ${node.operator} ${node.value}`)
            : this.denyResult(`Metadata does not match: ${node.key} ${node.operator} ${node.value}`);
    }

    async evaluateCustom(node, context) {
        throw new Error('CUSTOM rules must be implemented via plugin system');
    }

    allowResult(reason) {
        return {
            decision: ELIGIBILITY_DECISIONS.ALLOW,
            reason,
            requirements: [],
            metadata: {}
        };
    }

    denyResult(reason) {
        return {
            decision: ELIGIBILITY_DECISIONS.DENY,
            reason,
            requirements: [],
            metadata: {}
        };
    }

    requirementResult(reason, requirements) {
        return {
            decision: ELIGIBILITY_DECISIONS.ALLOW_WITH_REQUIREMENTS,
            reason,
            requirements,
            metadata: {}
        };
    }
}

export default RuleEvaluator;
