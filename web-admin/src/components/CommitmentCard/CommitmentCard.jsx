import React from 'react';
import './CommitmentCard.css';

const CommitmentCard = ({ commitment }) => {
    const getStatusBadge = (status) => {
        const badges = {
            APPROVED: { text: 'Approved', class: 'badge-approved', icon: '✓' },
            PENDING_APPROVAL: { text: 'Pending', class: 'badge-pending', icon: '⏳' },
            REJECTED: { text: 'Rejected', class: 'badge-rejected', icon: '✗' },
            SUBMITTED: { text: 'Submitted', class: 'badge-submitted', icon: '📝' }
        };
        return badges[status] || { text: status, class: 'badge-default', icon: '•' };
    };

    const badge = getStatusBadge(commitment.status);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRankBadge = (rank) => {
        const medals = ['🥇', '🥈', '🥉'];
        return medals[rank - 1] || `#${rank}`;
    };

    return (
        <div className={`commitment-card ${badge.class}`}>
            <div className="commitment-header">
                <div className="commitment-title-section">
                    <h3>{commitment.survey_title}</h3>
                    <span className="commitment-type">{commitment.survey_type}</span>
                </div>
                <span className={`status-badge ${badge.class}`}>
                    <span className="badge-icon">{badge.icon}</span>
                    {badge.text}
                </span>
            </div>

            <div className="commitment-body">
                <div className="commitment-info">
                    <span className="info-label">Submitted:</span>
                    <span className="info-value">{formatDate(commitment.created_at)}</span>
                </div>

                {commitment.selections && commitment.selections.length > 0 && (
                    <div className="selections-section">
                        <h4>Your Selections:</h4>
                        <div className="selections-list">
                            {commitment.selections.map((selection) => (
                                <div key={selection.option_id} className="selection-item">
                                    {commitment.survey_type === 'PRIORITY' && (
                                        <span className="rank-badge">
                                            {getRankBadge(selection.rank)}
                                        </span>
                                    )}
                                    <span className="selection-label">
                                        {selection.option_label}
                                    </span>
                                    {selection.capacity && (
                                        <span className="selection-capacity">
                                            Capacity: {selection.capacity}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {commitment.status === 'REJECTED' && commitment.rejection_reason && (
                    <div className="rejection-reason">
                        <h4>Rejection Reason:</h4>
                        <p>{commitment.rejection_reason}</p>
                    </div>
                )}
            </div>

            <div className="commitment-footer">
                <button className="btn-view-details">View Details</button>
            </div>
        </div>
    );
};

export default CommitmentCard;
