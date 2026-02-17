import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../../api/axios';
import { EligibilityRuleBuilder } from '../../../components/EligibilityRuleBuilder';
import './Surveys.css';

const SurveyForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        title: '',
        type: 'PICK_N',
        config: { maxSelections: 1 },
        options: [{ label: '' }],
        eligibilityRules: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEdit) {
            loadSurvey();
        }
    }, [id]);

    const loadSurvey = async () => {
        try {
            const response = await axiosInstance.get(`/admin/surveys/${id}`);
            const survey = response.data.survey;
            setFormData({
                title: survey.title,
                type: survey.type,
                config: typeof survey.config === 'string' ? JSON.parse(survey.config) : survey.config,
                options: survey.options.length > 0 ? survey.options : [{ label: '' }],
                eligibilityRules: survey.eligibilityRules || null
            });
        } catch (err) {
            setError('Failed to load survey');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {
                ...formData,
                options: formData.options.filter(opt => opt.label.trim() !== '')
            };

            if (isEdit) {
                await axiosInstance.put(`/admin/surveys/${id}`, payload);
            } else {
                await axiosInstance.post('/admin/surveys', payload);
            }

            navigate('/admin/surveys');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to save survey');
        } finally {
            setLoading(false);
        }
    };

    const addOption = () => {
        setFormData({
            ...formData,
            options: [...formData.options, { label: '' }]
        });
    };

    const removeOption = (index) => {
        setFormData({
            ...formData,
            options: formData.options.filter((_, i) => i !== index)
        });
    };

    const updateOption = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = { label: value };
        setFormData({ ...formData, options: newOptions });
    };

    return (
        <div className="survey-form-container">
            <h1>{isEdit ? 'Edit Survey' : 'Create Survey'}</h1>

            <form onSubmit={handleSubmit} className="survey-form">
                <div className="form-group">
                    <label>Survey Title *</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="Enter survey title"
                    />
                </div>

                <div className="form-group">
                    <label>Survey Type *</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        required
                    >
                        <option value="PICK_N">Pick N Options</option>
                        <option value="PRIORITY">Priority Ranking</option>
                        <option value="CALENDAR_SLOT">Calendar Slot</option>
                        <option value="VERIFICATION">Verification</option>
                    </select>
                </div>

                {formData.type === 'PICK_N' && (
                    <div className="form-group">
                        <label>Max Selections</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.config.maxSelections || 1}
                            onChange={(e) => setFormData({
                                ...formData,
                                config: { ...formData.config, maxSelections: parseInt(e.target.value) }
                            })}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label>Options *</label>
                    {formData.options.map((option, index) => (
                        <div key={index} className="option-row">
                            <input
                                type="text"
                                value={option.label}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                required
                            />
                            {formData.options.length > 1 && (
                                <button
                                    type="button"
                                    className="btn-remove"
                                    onClick={() => removeOption(index)}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className="btn-secondary" onClick={addOption}>
                        + Add Option
                    </button>
                </div>

                <EligibilityRuleBuilder
                    rules={formData.eligibilityRules}
                    onChange={(rules) => setFormData({ ...formData, eligibilityRules: rules })}
                />

                {error && <div className="error-message">{error}</div>}

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => navigate('/admin/surveys')}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : (isEdit ? 'Update Survey' : 'Create Survey')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SurveyForm;
