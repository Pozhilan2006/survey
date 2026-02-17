import React, { useState } from 'react';
import SurveyModal from '../SurveyModal/SurveyModal';
import WaitlistButton from '../WaitlistButton/WaitlistButton';
import './SurveyCard.css';

const SurveyCard = ({ survey, onRefresh }) => {
    const [showModal, setShowModal] = useState(false);

    const getStatusBadge = (status) => {
        const badges = {
            AVAILABLE: { text: 'Available', class: 'badge-available' },
            HELD: { text: 'Seat Held', class: 'badge-held' },
            SUBMITTED: { text: 'Submitted', class: 'badge-submitted' },
            FULL: { text: 'Full', class: 'badge-full' }
        };
        return badges[status] || { text: status, class: 'badge-default' };
    };

    const badge = getStatusBadge(survey.userStatus);

    const formatDate = (dateString) => {
        if (!dateString) return 'No deadline';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getSeatsColor = () => {
        const percentage = (survey.remainingSeats / (survey.config?.totalCapacity || 100)) * 100;
        if (percentage > 50) return 'seats-high';
        if (percentage > 20) return 'seats-medium';
        return 'seats-low';
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        if (onRefresh) {
            onRefresh();
        }
    };

    return (
        <>
            <div className="survey-card">
                <div className="survey-card-header">
                    <h3 className="survey-title">{survey.title}</h3>
                    <span className={`status - badge ${badge.class} `}>
                        {badge.text}
                    </span>
                </div>

                {survey.description && (
                    <p className="survey-description">{survey.description}</p>
                )}

                <div className="survey-meta">
                    <div className="meta-item">
                        <span className="meta-label">Type:</span>
                        <span className="meta-value">{survey.type}</span>
                    </div>
                    <div className="meta-item">
                        <span className="meta-label">Deadline:</span>
                        <span className="meta-value">{formatDate(survey.activeTo)}</span>
                    </div>
                </div>

                <div className="seats-info">
                    <div className="seats-header">
                        <span>Remaining Seats</span>
                        <span className={`seats - count ${getSeatsColor()} `}>
                            {survey.remainingSeats}
                        </span>
                    </div>
                    <div className="seats-progress">
                        <div
                            className={`seats - bar ${getSeatsColor()} `}
                            style={{
                                width: `${Math.min(100, (survey.remainingSeats / (survey.config?.totalCapacity || 100)) * 100)}% `
                            }}
                        ></div>
                    </div>
                </div>

                {survey.userStatus === 'HELD' && survey.userDetails && (
                    <div className="hold-timer">
                        <span className="timer-icon">⏱️</span>
                        <span>Hold expires: {formatDate(survey.userDetails.expiresAt)}</span>
                    </div>
                )}

                {survey.userStatus === 'SUBMITTED' && survey.userDetails && (
                    <div className="submission-info">
                        <span className="check-icon">✓</span>
                        <span>Submitted on {formatDate(survey.userDetails.submittedAt)}</span>
                    </div>
                )}

                <div className="survey-actions">
                    {survey.userStatus === 'AVAILABLE' && (
                        <button className="btn-primary" onClick={() => setShowModal(true)}>
                            View Survey
                        </button>
                    )}
                    {survey.userStatus === 'HELD' && (
                        <>
                            <button className="btn-primary" onClick={() => setShowModal(true)}>
                                Complete Submission
                            </button>
                            <button className="btn-secondary">
                                Release Hold
                            </button>
                        </>
                    )}
                    {survey.userStatus === 'SUBMITTED' && (
                        <button className="btn-secondary">
                            View Submission
                        </button>
                    )}
                    {survey.userStatus === 'FULL' && (
                        <WaitlistButton survey={survey} onUpdate={onRefresh} />
                    )}
                </div>
            </div>

            {showModal && (
                <SurveyModal
                    survey={survey}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </>
    );
};

export default SurveyCard;
