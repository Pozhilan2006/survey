import React, { useState, useEffect } from 'react';
import { getApprovals } from '../api/apiClient';
import './Approvals.css';

export default function Approvals() {
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadApprovals();
    }, []);

    const loadApprovals = async () => {
        try {
            // TODO: Replace with real API call
            const data = await getApprovals();
            setApprovals(data);
        } catch (error) {
            console.error('Failed to load approvals:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = (approvalId) => {
        // TODO: Implement approval logic
        // await approveSubmission(approvalId);
        console.log('Approve:', approvalId);
        alert('TODO: Implement approval logic');
    };

    const handleReject = (approvalId) => {
        // TODO: Implement rejection logic
        // await rejectSubmission(approvalId);
        console.log('Reject:', approvalId);
        alert('TODO: Implement rejection logic');
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: { background: '#fef3c7', color: '#92400e' },
            APPROVED: { background: '#d1fae5', color: '#065f46' },
            REJECTED: { background: '#fee2e2', color: '#991b1b' }
        };
        return styles[status] || styles.PENDING;
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="approvals-page">
            <h2 className="page-title">Approvals</h2>

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
                        {approvals.map((approval) => (
                            <tr key={approval.id}>
                                <td className="font-medium">{approval.studentName}</td>
                                <td>{approval.survey}</td>
                                <td className="text-gray">
                                    {new Date(approval.submittedAt).toLocaleString()}
                                </td>
                                <td>
                                    <span
                                        className="status-badge"
                                        style={getStatusBadge(approval.status)}
                                    >
                                        {approval.status}
                                    </span>
                                </td>
                                <td>
                                    {approval.status === 'PENDING' ? (
                                        <div className="action-buttons">
                                            <button
                                                className="approve-btn"
                                                onClick={() => handleApprove(approval.id)}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                className="reject-btn"
                                                onClick={() => handleReject(approval.id)}
                                            >
                                                Reject
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
        </div>
    );
}
