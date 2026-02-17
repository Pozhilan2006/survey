import React, { useState } from 'react';
import './ApprovalCard.css';

const ApprovalCard = ({ approval, onApprove, onReject }) => {
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [notes, setNotes] = useState('');
    const [reason, setReason] = useState('');

    const handleApprove = () => {
        onApprove(approval.submission_id, notes);
        setShowApproveModal(false);
        setNotes('');
    };

    const handleReject = () => {
        if (!reason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        onReject(approval.submission_id, reason);
        setShowRejectModal(false);
        setReason('');
    };

    const getRankBadge = (rank) => {
        const medals = ['🥇', '🥈', '🥉'];
        return medals[rank - 1] || `#${rank}`;
    };

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

    return (
        <>
            <div className="approval-card">
                <div className="approval-header">
                    <div className="approval-title-section">
                        <h3>{approval.survey_title}</h3>
                        <span className="survey-type">{approval.survey_type}</span>
                    </div>
                    <span className="pending-badge">⏳ Pending</span>
                </div>

                <div className="approval-body">
                    <div className="approval-info">
                        <div className="info-row">
                            <span className="info-label">Student:</span>
                            <span className="info-value">{approval.student_name || approval.student_email}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Submitted:</span>
                            <span className="info-value">{formatDate(approval.created_at)}</span>
                        </div>
                    </div>

                    {approval.selections && approval.selections.length > 0 && (
                        <div className="selections-section">
                            <h4>Selections:</h4>
                            <ul className="selections-list">
                                {approval.selections.map((sel, idx) => (
                                    <li key={idx} className="selection-item">
                                        {approval.survey_type === 'PRIORITY' && (
                                            <span className="rank-badge">{getRankBadge(sel.rank)}</span>
                                        )}
                                        <span className="selection-label">{sel.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="approval-actions">
                    <button className="btn-approve" onClick={() => setShowApproveModal(true)}>
                        ✓ Approve
                    </button>
                    <button className="btn-reject" onClick={() => setShowRejectModal(true)}>
                        ✗ Reject
                    </button>
                </div>
            </div>

            {/* Approve Modal */}
            {showApproveModal && (
                <div className="modal-overlay" onClick={() => setShowApproveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Approve Submission</h3>
                        <p>Are you sure you want to approve this submission?</p>
                        <textarea
                            placeholder="Optional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                        <div className="modal-actions">
                            <button className="btn-confirm" onClick={handleApprove}>
                                Confirm Approve
                            </button>
                            <button className="btn-cancel" onClick={() => setShowApproveModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Reject Submission</h3>
                        <p className="warning-text">Please provide a reason for rejection. This will be shown to the student.</p>
                        <textarea
                            placeholder="Reason for rejection (required)..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            required
                        />
                        <div className="modal-actions">
                            <button className="btn-confirm btn-reject-confirm" onClick={handleReject}>
                                Confirm Reject
                            </button>
                            <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ApprovalCard;
