import React, { useState } from 'react';
import RuleGroup from './RuleGroup';
import './RuleBuilder.css';

const EligibilityRuleBuilder = ({ rules, onChange }) => {
    const [showPreview, setShowPreview] = useState(false);

    // Initialize with empty AND group if no rules exist
    const currentRules = rules || {
        rule: 'AND',
        conditions: []
    };

    const handleRulesChange = (newRules) => {
        onChange(newRules);
    };

    const handleClear = () => {
        onChange(null);
    };

    const hasRules = currentRules && currentRules.conditions && currentRules.conditions.length > 0;

    return (
        <div className="eligibility-rule-builder">
            <div className="rule-builder-header">
                <h3>Eligibility Rules</h3>
                <div className="rule-builder-actions">
                    {hasRules && (
                        <>
                            <button
                                type="button"
                                className="btn-preview"
                                onClick={() => setShowPreview(!showPreview)}
                            >
                                {showPreview ? 'Hide' : 'Show'} JSON
                            </button>
                            <button
                                type="button"
                                className="btn-clear"
                                onClick={handleClear}
                            >
                                Clear All
                            </button>
                        </>
                    )}
                </div>
            </div>

            {showPreview && hasRules && (
                <div className="rule-preview">
                    <h4>JSON Preview</h4>
                    <pre>{JSON.stringify(currentRules, null, 2)}</pre>
                </div>
            )}

            <div className="rule-builder-content">
                {!hasRules ? (
                    <div className="rule-builder-empty">
                        <p>No eligibility rules defined. Survey will be available to all users.</p>
                        <button
                            type="button"
                            className="btn-add-first-rule"
                            onClick={() => onChange({
                                rule: 'AND',
                                conditions: [{ rule: '', value: '' }]
                            })}
                        >
                            + Add First Rule
                        </button>
                    </div>
                ) : (
                    <RuleGroup
                        group={currentRules}
                        onChange={handleRulesChange}
                        onRemove={handleClear}
                        depth={0}
                    />
                )}
            </div>

            <div className="rule-builder-help">
                <details>
                    <summary>How to use eligibility rules</summary>
                    <ul>
                        <li><strong>AND</strong>: All conditions must be true for a user to be eligible</li>
                        <li><strong>OR</strong>: At least one condition must be true for a user to be eligible</li>
                        <li><strong>Nested Groups</strong>: Create complex logic by nesting AND/OR groups</li>
                        <li><strong>Example</strong>: (Department = CS AND Year = 2024) OR (In Group = "Honors Students")</li>
                    </ul>
                </details>
            </div>
        </div>
    );
};

export default EligibilityRuleBuilder;
