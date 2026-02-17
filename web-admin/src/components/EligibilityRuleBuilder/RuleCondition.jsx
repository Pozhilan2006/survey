import React from 'react';
import './RuleBuilder.css';

const RuleCondition = ({ rule, onChange, onRemove, depth = 0 }) => {
    const ruleTypes = [
        { value: 'DEPARTMENT_EQUALS', label: 'Department Equals' },
        { value: 'YEAR_EQUALS', label: 'Year Equals' },
        { value: 'IN_GROUP', label: 'In Group' },
        { value: 'NOT_IN_GROUP', label: 'Not In Group' },
        { value: 'HAS_ROLE', label: 'Has Role' },
    ];

    const departments = ['CS', 'EE', 'ME', 'CE', 'BT', 'CH', 'PH', 'MA'];
    const years = ['2021', '2022', '2023', '2024', '2025'];

    const handleRuleTypeChange = (newType) => {
        onChange({
            rule: newType,
            value: '',
            ...(newType === 'IN_GROUP' || newType === 'NOT_IN_GROUP' ? { groupId: '' } : {})
        });
    };

    const handleValueChange = (newValue) => {
        onChange({ ...rule, value: newValue });
    };

    const handleGroupIdChange = (newGroupId) => {
        onChange({ ...rule, groupId: newGroupId });
    };

    return (
        <div className="rule-condition" style={{ marginLeft: `${depth * 20}px` }}>
            <div className="rule-condition-content">
                <select
                    className="rule-type-select"
                    value={rule.rule || ''}
                    onChange={(e) => handleRuleTypeChange(e.target.value)}
                >
                    <option value="">Select Rule Type...</option>
                    {ruleTypes.map(type => (
                        <option key={type.value} value={type.value}>
                            {type.label}
                        </option>
                    ))}
                </select>

                {rule.rule === 'DEPARTMENT_EQUALS' && (
                    <select
                        className="rule-value-input"
                        value={rule.value || ''}
                        onChange={(e) => handleValueChange(e.target.value)}
                    >
                        <option value="">Select Department...</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                )}

                {rule.rule === 'YEAR_EQUALS' && (
                    <select
                        className="rule-value-input"
                        value={rule.value || ''}
                        onChange={(e) => handleValueChange(e.target.value)}
                    >
                        <option value="">Select Year...</option>
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                )}

                {(rule.rule === 'IN_GROUP' || rule.rule === 'NOT_IN_GROUP') && (
                    <input
                        type="text"
                        className="rule-value-input"
                        placeholder="Enter group ID or name"
                        value={rule.groupId || rule.value || ''}
                        onChange={(e) => handleGroupIdChange(e.target.value)}
                    />
                )}

                {rule.rule === 'HAS_ROLE' && (
                    <select
                        className="rule-value-input"
                        value={rule.value || ''}
                        onChange={(e) => handleValueChange(e.target.value)}
                    >
                        <option value="">Select Role...</option>
                        <option value="STUDENT">Student</option>
                        <option value="ADMIN">Admin</option>
                        <option value="APPROVER">Approver</option>
                    </select>
                )}

                <button
                    type="button"
                    className="btn-remove-rule"
                    onClick={onRemove}
                    title="Remove condition"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default RuleCondition;
