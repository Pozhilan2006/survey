import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import ApprovalCard from '../../components/ApprovalCard/ApprovalCard';
import './Dashboard.css';

const ApproverDashboard = () => {
    const [stats, setStats] = useState({});
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [assignedSurveys, setAssignedSurveys] = useState([]);
    const [selectedSurvey, setSelectedSurvey] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDashboard();
    }, []);

    useEffect(() => {
        loadPendingApprovals();
    }, [selectedSurvey]);

    const loadDashboard = async () => {
        try {
            const response = await axiosInstance.get('/approver/dashboard');
            setStats(response.data.data.stats);
            setAssignedSurveys(response.data.data.assignedSurveys);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            setError('Failed to load dashboard');
        }
    };

    const loadPendingApprovals = async () => {
        try {
            setLoading(true);
            setError('');

            const params = selectedSurvey !== 'all' ? { surveyId: selectedSurvey } : {};
            const response = await axiosInstance.get('/approver/pending', { params });
            setPendingApprovals(response.data.data);
        } catch (error) {
            console.error('Error loading approvals:', error);
            setError('Failed to load pending approvals');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (submissionId, notes) => {
        try {
            await axiosInstance.post(`/approver/submissions/${submissionId}/approve`, { notes });
            await loadPendingApprovals();
            await loadDashboard();
        } catch (error) {
            console.error('Error approving:', error);
            alert('Failed to approve submission');
        }
    };

    const handleReject = async (submissionId, reason) => {
        try {
            await axiosInstance.post(`/approver/submissions/${submissionId}/reject`, { reason });
            await loadPendingApprovals();
            await loadDashboard();
        } catch (error) {
            console.error('Error rejecting:', error);
            alert('Failed to reject submission');
        }
    };

    return (
        <div className="approver-dashboard">
            <div className="dashboard-header">
                <h1>Approver Dashboard</h1>
                <p>Review and approve survey submissions</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card stat-pending">
                    <span className="stat-value">{stats.pendingApprovals || 0}</span>
                    <span className="stat-label">Pending Approvals</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.assignedSurveys || 0}</span>
                    <span className="stat-label">Assigned Surveys</span>
                </div>
            </div>

            {/* Survey Filter */}
            {assignedSurveys.length > 0 && (
                <div className="filter-section">
                    <label htmlFor="survey-filter">Filter by Survey:</label>
                    <select
                        id="survey-filter"
                        value={selectedSurvey}
                        onChange={(e) => setSelectedSurvey(e.target.value)}
                        className="survey-filter-select"
                    >
                        <option value="all">All Surveys ({stats.pendingApprovals || 0} pending)</option>
                        {assignedSurveys.map(survey => (
                            <option key={survey.id} value={survey.id}>
                                {survey.title} ({survey.pending_count} pending)
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Pending Approvals */}
            <div className="approvals-section">
                <h2>Pending Approvals</h2>
                {loading ? (
                    <div className="loading">Loading approvals...</div>
                ) : pendingApprovals.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">✅</span>
                        <h3>No pending approvals</h3>
                        <p>All caught up! No submissions waiting for review.</p>
                    </div>
                ) : (
                    <div className="approvals-grid">
                        {pendingApprovals.map(approval => (
                            <ApprovalCard
                                key={approval.submission_id}
                                approval={approval}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApproverDashboard;
