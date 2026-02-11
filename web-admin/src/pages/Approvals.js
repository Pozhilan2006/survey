import React, { useState, useEffect } from 'react';
import { getSubmissions, approveSubmission, rejectSubmission } from '../api/apiClient';
import './Approvals.css';

export default function Approvals() {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        loadSubmissions();
    }, []);

    const loadSubmissions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSubmissions();
            setSubmissions(data);
        } catch (error) {
            console.error('Failed to load submissions:', error);
            setError('Failed to load submissions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (participationId) => {
        try {
            setActionLoading(participationId);
            await approveSubmission(participationId);
            // Refresh the list
            await loadSubmissions();
        } catch (error) {
            console.error('Failed to approve submission:', error);
            alert('Failed to approve submission: ' + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (participationId) => {
        try {
            setActionLoading(participationId);
            await rejectSubmission(participationId);
            // Refresh the list
            await loadSubmissions();
        } catch (error) {
            console.error('Failed to reject submission:', error);
            alert('Failed to reject submission: ' + error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            SUBMITTED: { background: '#fef3c7', color: '#92400e' },
            APPROVED: { background: '#d1fae5', color: '#065f46' },
            REJECTED: { background: '#fee2e2', color: '#991b1b' }
        };
        return styles[status] || styles.SUBMITTED;
    };

    const getStatusLabel = (status) => {
        const labels = {
            SUBMITTED: 'Pending Review',
            APPROVED: 'Approved',
            REJECTED: 'Rejected'
        };
        return labels[status] || status;
    };

    if (loading) {
        return <div className="loading">Loading submissions...</div>;
    }

    if (error) {
        return (
            <div className="error-state">
                <p>{error}</p>
                <button onClick={loadSubmissions}>Retry</button>
            </div>
        );
    }

    return (
        <div className="approvals-page">
            <div className="page-header">
                <h2 className="page-title">Approvals</h2>
                <button onClick={loadSubmissions} className="refresh-btn">
                    Refresh
                </button>
            </div>

            {submissions.length === 0 ? (
                <div className="empty-state">
                    <p>No submissions found</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Survey</th>
                                <th>Submitted Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map((submission) => (
                                <tr key={submission.participationId}>
                                    <td className="font-medium">{submission.studentName}</td>
                                    <td>{submission.surveyTitle}</td>
                                    <td className="text-gray">
                                        {new Date(submission.submittedAt).toLocaleString()}
                                    </td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={getStatusBadge(submission.status)}
                                        >
                                            {getStatusLabel(submission.status)}
                                        </span>
                                    </td>
                                    <td>
                                        {submission.status === 'SUBMITTED' ? (
                                            <div className="action-buttons">
                                                <button
                                                    className="approve-btn"
                                                    onClick={() => handleApprove(submission.participationId)}
                                                    disabled={actionLoading === submission.participationId}
                                                >
                                                    {actionLoading === submission.participationId ? 'Processing...' : 'Approve'}
                                                </button>
                                                <button
                                                    className="reject-btn"
                                                    onClick={() => handleReject(submission.participationId)}
                                                    disabled={actionLoading === submission.participationId}
                                                >
                                                    {actionLoading === submission.participationId ? 'Processing...' : 'Reject'}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-gray">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
