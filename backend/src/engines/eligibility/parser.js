/**
 * Rule Parser - Converts JSON DSL to Abstract Syntax Tree (AST)
 * 
 * Validates rule structure and converts to normalized AST format
 * for evaluation.
 */
export class RuleParser {
    /**
     * Parse eligibility rules DSL into AST
     * 
     * @param {object} rules - Eligibility rules in JSON DSL format
     * @returns {object} Abstract Syntax Tree
     */
    parse(rules) {
        if (!rules || typeof rules !== 'object') {
            throw new Error('Rules must be a valid object');
        }

        return this.parseNode(rules);
    }

    /**
     * Parse a single rule node
     * 
     * @param {object} node - Rule node
     * @returns {object} Parsed AST node
     */
    parseNode(node) {
        if (!node.rule) {
            throw new Error('Rule node must have a "rule" property');
        }

        const rule = node.rule.toUpperCase();

        // Validate rule type
        const validRules = [
            'AND', 'OR', 'NOT',
            'IN_GROUP', 'NOT_IN_GROUP',
            'SURVEY_COMPLETED', 'SURVEY_APPROVED', 'SURVEY_ALLOCATED',
            'DOCUMENT_VERIFIED', 'DOCUMENT_UPLOADED',
            'TIME_WINDOW', 'BEFORE_TIME', 'AFTER_TIME',
            'QUOTA_AVAILABLE',
            'HAS_ROLE',
            'METADATA_MATCH',
            'YEAR_EQUALS',
            'DEPARTMENT_EQUALS',
            'CUSTOM'
        ];

        if (!validRules.includes(rule)) {
            throw new Error(`Unknown rule type: ${rule}`);
        }

        // Parse based on rule type
        switch (rule) {
            case 'AND':
            case 'OR':
                return this.parseLogicalOperator(rule, node);

            case 'NOT':
                return this.parseNotOperator(node);

            case 'IN_GROUP':
            case 'NOT_IN_GROUP':
                return this.parseGroupOperator(rule, node);

            case 'SURVEY_COMPLETED':
            case 'SURVEY_APPROVED':
            case 'SURVEY_ALLOCATED':
                return this.parseSurveyOperator(rule, node);

            case 'DOCUMENT_VERIFIED':
            case 'DOCUMENT_UPLOADED':
                return this.parseDocumentOperator(rule, node);

            case 'TIME_WINDOW':
            case 'BEFORE_TIME':
            case 'AFTER_TIME':
                return this.parseTimeOperator(rule, node);

            case 'QUOTA_AVAILABLE':
                return this.parseQuotaOperator(node);

            case 'HAS_ROLE':
                return this.parseRoleOperator(node);

            case 'METADATA_MATCH':
                return this.parseMetadataOperator(node);

            case 'CUSTOM':
                return this.parseCustomOperator(node);

            case 'YEAR_EQUALS':
                return this.parseYearEquals(node);

            case 'DEPARTMENT_EQUALS':
                return this.parseDepartmentEquals(node);

            default:
                throw new Error(`Unhandled rule type: ${rule}`);
        }
    }

    parseYearEquals(node) {
        if (!node.value) {
            throw new Error('YEAR_EQUALS operator requires "value" property');
        }
        return {
            rule: 'YEAR_EQUALS',
            value: node.value,
            operator: node.operator || 'equals' // optional, default equals
        };
    }

    parseDepartmentEquals(node) {
        if (!node.value) {
            throw new Error('DEPARTMENT_EQUALS operator requires "value" property');
        }
        return {
            rule: 'DEPARTMENT_EQUALS',
            value: node.value
        };
    }

    parseLogicalOperator(operator, node) {
        if (!node.conditions || !Array.isArray(node.conditions)) {
            throw new Error(`${operator} operator requires "conditions" array`);
        }

        if (node.conditions.length === 0) {
            throw new Error(`${operator} operator requires at least one condition`);
        }

        return {
            rule: operator,
            conditions: node.conditions.map(c => this.parseNode(c))
        };
    }

    parseNotOperator(node) {
        if (!node.condition) {
            throw new Error('NOT operator requires "condition" property');
        }

        return {
            rule: 'NOT',
            condition: this.parseNode(node.condition)
        };
    }

    parseGroupOperator(operator, node) {
        if (!node.group && !node.groupId) {
            throw new Error(`${operator} operator requires "group" or "groupId" property`);
        }

        return {
            rule: operator,
            group: node.group,
            groupId: node.groupId
        };
    }

    parseSurveyOperator(operator, node) {
        if (!node.survey_release_id && !node.surveyReleaseId) {
            throw new Error(`${operator} operator requires "survey_release_id" or "surveyReleaseId" property`);
        }

        return {
            rule: operator,
            surveyReleaseId: node.survey_release_id || node.surveyReleaseId
        };
    }

    parseDocumentOperator(operator, node) {
        if (!node.document_type && !node.documentType) {
            throw new Error(`${operator} operator requires "document_type" or "documentType" property`);
        }

        return {
            rule: operator,
            documentType: node.document_type || node.documentType,
            optionId: node.option_id || node.optionId
        };
    }

    parseTimeOperator(operator, node) {
        if (operator === 'TIME_WINDOW') {
            if (!node.start || !node.end) {
                throw new Error('TIME_WINDOW operator requires "start" and "end" properties');
            }
            return {
                rule: operator,
                start: new Date(node.start),
                end: new Date(node.end)
            };
        } else if (operator === 'BEFORE_TIME') {
            if (!node.time) {
                throw new Error('BEFORE_TIME operator requires "time" property');
            }
            return {
                rule: operator,
                time: new Date(node.time)
            };
        } else if (operator === 'AFTER_TIME') {
            if (!node.time) {
                throw new Error('AFTER_TIME operator requires "time" property');
            }
            return {
                rule: operator,
                time: new Date(node.time)
            };
        }
    }

    parseQuotaOperator(node) {
        return {
            rule: 'QUOTA_AVAILABLE',
            optionId: node.option_id || node.optionId,
            minAvailable: node.min_available || node.minAvailable || 1
        };
    }

    parseRoleOperator(node) {
        if (!node.role) {
            throw new Error('HAS_ROLE operator requires "role" property');
        }

        return {
            rule: 'HAS_ROLE',
            role: node.role
        };
    }

    parseMetadataOperator(node) {
        if (!node.key || node.value === undefined) {
            throw new Error('METADATA_MATCH operator requires "key" and "value" properties');
        }

        return {
            rule: 'METADATA_MATCH',
            key: node.key,
            value: node.value,
            operator: node.operator || 'equals' // equals, contains, gt, lt, gte, lte
        };
    }

    parseCustomOperator(node) {
        if (!node.handler) {
            throw new Error('CUSTOM operator requires "handler" property');
        }

        return {
            rule: 'CUSTOM',
            handler: node.handler,
            params: node.params || {}
        };
    }
}

export default RuleParser;
