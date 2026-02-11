import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../api/apiClient';
import './Dashboard.css';

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await getDashboardStats();
            setStats(data);
            setError(null);
        } catch (error) {
            console.error('Failed to load stats:', error);
            setError('Failed to load dashboard data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!stats) return null;

    return (
        <div className="dashboard">
            <h2 className="dashboard-title">Dashboard</h2>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dbeafe' }}>
                        📝
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalSurveys}</div>
                        <div className="stat-label">Total Surveys</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#d1fae5' }}>
                        ✅
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.activeSurveys}</div>
                        <div className="stat-label">Active Surveys</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
