import React from 'react';
import RuleCondition from './RuleCondition';
import './RuleBuilder.css';

const RuleGroup = ({ group, onChange, onRemove, depth = 0 }) => {
    const handleOperatorChange = (newOperator) => {
        onChange({
            ...group,
            rule: newOperator,
            conditions: group.conditions || []
        });
    };

    const handleConditionChange = (index, newCondition) => {
        const newConditions = [...(group.conditions || [])];
        newConditions[index] = newCondition;
        onChange({ ...group, conditions: newConditions });
    };

    const handleConditionRemove = (index) => {
        const newConditions = (group.conditions || []).filter((_, i) => i !== index);
        onChange({ ...group, conditions: newConditions });
    };

    const addCondition = () => {
        const newConditions = [...(group.conditions || []), { rule: '', value: '' }];
        onChange({ ...group, conditions: newConditions });
    };

    const addNestedGroup = () => {
        const newConditions = [...(group.conditions || []), {
            rule: 'AND',
            conditions: [{ rule: '', value: '' }]
        }];
        onChange({ ...group, conditions: newConditions });
    };

    const isGroup = (condition) => {
        return condition.rule === 'AND' || condition.rule === 'OR' || condition.rule === 'NOT';
    };

    return (
        <div className="rule-group" style={{ marginLeft: `${depth * 20}px` }}>
            <div className="rule-group-header">
                <select
                    className="operator-select"
                    value={group.rule || 'AND'}
                    onChange={(e) => handleOperatorChange(e.target.value)}
                >
                    <option value="AND">AND (All must match)</option>
                    <option value="OR">OR (Any must match)</option>
                </select>

                {depth > 0 && (
                    <button
                        type="button"
                        className="btn-remove-group"
                        onClick={onRemove}
                        title="Remove group"
                    >
                        × Remove Group
                    </button>
                )}
            </div>

            <div className="rule-group-content">
                {(group.conditions || []).map((condition, index) => (
                    <div key={index} className="rule-item">
                        {isGroup(condition) ? (
                            <RuleGroup
                                group={condition}
                                onChange={(newGroup) => handleConditionChange(index, newGroup)}
                                onRemove={() => handleConditionRemove(index)}
                                depth={depth + 1}
                            />
                        ) : (
                            <RuleCondition
                                rule={condition}
                                onChange={(newRule) => handleConditionChange(index, newRule)}
                                onRemove={() => handleConditionRemove(index)}
                                depth={depth + 1}
                            />
                        )}
                    </div>
                ))}

                <div className="rule-group-actions">
                    <button
                        type="button"
                        className="btn-add-condition"
                        onClick={addCondition}
                    >
                        + Add Condition
                    </button>
                    {depth < 3 && (
                        <button
                            type="button"
                            className="btn-add-group"
                            onClick={addNestedGroup}
                        >
                            + Add Nested Group
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RuleGroup;
