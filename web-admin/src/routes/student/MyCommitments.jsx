import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import CommitmentCard from '../../components/CommitmentCard/CommitmentCard';
import './MyCommitments.css';

const MyCommitments = () => {
    const [commitments, setCommitments] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({});

    useEffect(() => {
        loadCommitments();
    }, []);

    const loadCommitments = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axiosInstance.get('/participation/my-commitments');

            setCommitments(response.data.data.all);
            setStats(response.data.data.stats);
        } catch (err) {
            console.error('Error loading commitments:', err);
            setError('Failed to load commitments');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredCommitments = () => {
        if (filter === 'all') return commitments;

        const statusMap = {
            approved: 'APPROVED',
            pending: 'PENDING_APPROVAL',
            rejected: 'REJECTED',
            submitted: 'SUBMITTED'
        };

        return commitments.filter(c => c.status === statusMap[filter]);
    };

    const filteredCommitments = getFilteredCommitments();

    return (
        <div className="my-commitments">
            <div className="page-header">
                <h1>My Commitments</h1>
                <p>Track all your survey submissions and their status</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">{stats.total || 0}</span>
                    <span className="stat-label">Total Submissions</span>
                </div>
                <div className="stat-card stat-approved">
                    <span className="stat-value">{stats.approved || 0}</span>
                    <span className="stat-label">Approved</span>
                </div>
                <div className="stat-card stat-pending">
                    <span className="stat-value">{stats.pending || 0}</span>
                    <span className="stat-label">Pending</span>
                </div>
                <div className="stat-card stat-rejected">
                    <span className="stat-value">{stats.rejected || 0}</span>
                    <span className="stat-label">Rejected</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({stats.total || 0})
                </button>
                <button
                    className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
                    onClick={() => setFilter('approved')}
                >
                    Approved ({stats.approved || 0})
                </button>
                <button
                    className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Pending ({stats.pending || 0})
                </button>
                <button
                    className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setFilter('rejected')}
                >
                    Rejected ({stats.rejected || 0})
                </button>
            </div>

            {/* Content */}
            {loading && <div className="loading">Loading commitments...</div>}
            {error && <div className="error-message">{error}</div>}

            {!loading && !error && (
                <>
                    {filteredCommitments.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📋</span>
                            <h3>No commitments found</h3>
                            <p>
                                {filter === 'all'
                                    ? "You haven't submitted any surveys yet"
                                    : `No ${filter} submissions`
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="commitments-grid">
                            {filteredCommitments.map(commitment => (
                                <CommitmentCard
                                    key={commitment.submission_id}
                                    commitment={commitment}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MyCommitments;
