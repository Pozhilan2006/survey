import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import SurveyCard from '../../components/SurveyCard/SurveyCard';
import './Dashboard.css';

const StudentDashboard = () => {
    const [surveys, setSurveys] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/participation/dashboard');

            if (response.data.success) {
                setSurveys(response.data.data.surveys);
                setStats(response.data.data.stats);
            }
        } catch (err) {
            console.error('Error loading dashboard:', err);
            setError('Failed to load dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredSurveys = surveys.filter(survey => {
        if (filter === 'all') return true;
        if (filter === 'available') return survey.userStatus === 'AVAILABLE';
        if (filter === 'held') return survey.userStatus === 'HELD';
        if (filter === 'submitted') return survey.userStatus === 'SUBMITTED';
        if (filter === 'full') return survey.userStatus === 'FULL';
        return true;
    });

    if (loading) {
        return (
            <div className="student-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your surveys...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="student-dashboard">
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={loadDashboard} className="btn-retry">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="student-dashboard">
            <div className="dashboard-header">
                <h1>My Surveys</h1>
                <p className="subtitle">Surveys you're eligible to participate in</p>
            </div>

            {stats && (
                <div className="dashboard-stats">
                    <div className="stat-card">
                        <span className="stat-value">{stats.totalEligible}</span>
                        <span className="stat-label">Total Eligible</span>
                    </div>
                    <div className="stat-card stat-available">
                        <span className="stat-value">{stats.available}</span>
                        <span className="stat-label">Available</span>
                    </div>
                    <div className="stat-card stat-held">
                        <span className="stat-value">{stats.held}</span>
                        <span className="stat-label">Held</span>
                    </div>
                    <div className="stat-card stat-submitted">
                        <span className="stat-value">{stats.submitted}</span>
                        <span className="stat-label">Submitted</span>
                    </div>
                </div>
            )}

            <div className="filter-bar">
                <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All ({surveys.length})
                </button>
                <button
                    className={`filter-btn ${filter === 'available' ? 'active' : ''}`}
                    onClick={() => setFilter('available')}
                >
                    Available ({stats?.available || 0})
                </button>
                <button
                    className={`filter-btn ${filter === 'held' ? 'active' : ''}`}
                    onClick={() => setFilter('held')}
                >
                    Held ({stats?.held || 0})
                </button>
                <button
                    className={`filter-btn ${filter === 'submitted' ? 'active' : ''}`}
                    onClick={() => setFilter('submitted')}
                >
                    Submitted ({stats?.submitted || 0})
                </button>
            </div>

            {filteredSurveys.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No surveys found</h3>
                    <p>
                        {filter === 'all'
                            ? "You don't have any eligible surveys at the moment."
                            : `No surveys with status "${filter}".`}
                    </p>
                </div>
            ) : (
                <div className="survey-grid">
                    {filteredSurveys.map(survey => (
                        <SurveyCard
                            key={survey.releaseId}
                            survey={survey}
                            onRefresh={loadDashboard}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
