import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import PriorityRanking from '../PriorityRanking/PriorityRanking';
import './SurveyModal.css';

const SurveyModal = ({ survey, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [holdExpiry, setHoldExpiry] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [priorityRanking, setPriorityRanking] = useState([]);
    const [surveyOptions, setSurveyOptions] = useState([]);

    useEffect(() => {
        loadSurveyOptions();

        // If survey is already held, set the expiry time
        if (survey.userStatus === 'HELD' && survey.userDetails?.expiresAt) {
            setHoldExpiry(new Date(survey.userDetails.expiresAt));
        }
    }, [survey]);

    // Countdown timer for hold expiry
    useEffect(() => {
        if (!holdExpiry) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = holdExpiry - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                clearInterval(interval);
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [holdExpiry]);

    const loadSurveyOptions = async () => {
        try {
            const response = await axiosInstance.get(`/admin/surveys/${survey.surveyId}/options`);
            setSurveyOptions(response.data.options || []);
        } catch (err) {
            console.error('Error loading options:', err);
            setError('Failed to load survey options');
        }
    };

    const handleHoldSeat = async () => {
        try {
            setLoading(true);
            setError('');

            // Create participation first if needed
            let participationId = survey.participationId;

            if (!participationId) {
                const startResponse = await axiosInstance.post(
                    `/participation/releases/${survey.releaseId}/participate`
                );
                participationId = startResponse.data.participation.id;
            }

            // Hold seat (for now, just hold without specific option)
            const holdResponse = await axiosInstance.post(
                `/participation/${participationId}/hold`,
                { optionId: surveyOptions[0]?.id } // Simplified for now
            );

            setHoldExpiry(new Date(holdResponse.data.hold.expires_at));
            onSuccess();
        } catch (err) {
            console.error('Error holding seat:', err);
            setError(err.response?.data?.message || 'Failed to hold seat');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError('');

            // Validate based on survey type
            if (survey.type === 'PRIORITY') {
                // For priority surveys, all options must be ranked
                if (priorityRanking.length !== surveyOptions.length) {
                    setError('Please rank all options');
                    return;
                }
            } else {
                // For PICK_N surveys
                const maxSelections = survey.config?.maxSelections || 1;
                if (selectedOptions.length === 0) {
                    setError('Please select at least one option');
                    return;
                }
                if (selectedOptions.length > maxSelections) {
                    setError(`You can only select up to ${maxSelections} option(s)`);
                    return;
                }
            }

            // Create participation if needed
            let participationId = survey.participationId;

            if (!participationId) {
                const startResponse = await axiosInstance.post(
                    `/participation/releases/${survey.releaseId}/participate`
                );
                participationId = startResponse.data.participation.id;
            }

            // Prepare selections based on survey type
            const selections = survey.type === 'PRIORITY'
                ? priorityRanking.map(optionId => ({ optionId }))
                : selectedOptions.map(optionId => ({ optionId }));

            // Submit survey
            await axiosInstance.post(
                `/participation/${participationId}/submit`,
                {
                    selections,
                    answers: {}
                }
            );

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error submitting survey:', err);
            setError(err.response?.data?.message || 'Failed to submit survey');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionToggle = (optionId) => {
        const maxSelections = survey.config?.maxSelections || 1;

        if (selectedOptions.includes(optionId)) {
            setSelectedOptions(selectedOptions.filter(id => id !== optionId));
        } else {
            if (maxSelections === 1) {
                setSelectedOptions([optionId]);
            } else if (selectedOptions.length < maxSelections) {
                setSelectedOptions([...selectedOptions, optionId]);
            } else {
                setError(`You can only select up to ${maxSelections} options`);
            }
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{survey.title}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {survey.description && (
                        <p className="survey-description">{survey.description}</p>
                    )}

                    <div className="survey-info">
                        <div className="info-item">
                            <span className="info-label">Type:</span>
                            <span className="info-value">{survey.type}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Max Selections:</span>
                            <span className="info-value">{survey.config?.maxSelections || 1}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Remaining Seats:</span>
                            <span className="info-value seats-count">{survey.remainingSeats}</span>
                        </div>
                    </div>

                    {holdExpiry && (
                        <div className="hold-timer-display">
                            <span className="timer-icon">⏱️</span>
                            <span>Hold expires in: <strong>{timeRemaining}</strong></span>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    {survey.userStatus !== 'SUBMITTED' && (
                        <div className="options-section">
                            {survey.type === 'PRIORITY' ? (
                                <>
                                    <h3>Rank Your Preferences</h3>
                                    <p className="priority-hint">
                                        Drag and drop to rank options from most preferred (top) to least preferred (bottom)
                                    </p>
                                    <PriorityRanking
                                        options={surveyOptions}
                                        initialRanking={priorityRanking}
                                        onChange={setPriorityRanking}
                                        maxSelections={surveyOptions.length}
                                    />
                                </>
                            ) : (
                                <>
                                    <h3>Select Your Options</h3>
                                    <div className="options-list">
                                        {surveyOptions.map(option => (
                                            <div
                                                key={option.id}
                                                className={`option-item ${selectedOptions.includes(option.id) ? 'selected' : ''}`}
                                                onClick={() => handleOptionToggle(option.id)}
                                            >
                                                <input
                                                    type={survey.config?.maxSelections === 1 ? 'radio' : 'checkbox'}
                                                    checked={selectedOptions.includes(option.id)}
                                                    onChange={() => { }}
                                                />
                                                <div className="option-content">
                                                    <span className="option-label">{option.label}</span>
                                                    {option.capacity && (
                                                        <span className="option-capacity">
                                                            Capacity: {option.capacity}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {survey.userStatus === 'AVAILABLE' && !holdExpiry && (
                        <button
                            className="btn-primary"
                            onClick={handleHoldSeat}
                            disabled={loading || survey.remainingSeats === 0}
                        >
                            {loading ? 'Holding...' : 'Hold Seat'}
                        </button>
                    )}

                    {(survey.userStatus === 'HELD' || holdExpiry) && (
                        <button
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={
                                loading ||
                                (survey.type === 'PRIORITY'
                                    ? priorityRanking.length !== surveyOptions.length
                                    : selectedOptions.length === 0
                                )
                            }
                        >
                            {loading ? 'Submitting...' : 'Submit Survey'}
                        </button>
                    )}

                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SurveyModal;
