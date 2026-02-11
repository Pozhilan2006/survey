import React, { useState, useEffect } from 'react';
import { getSurveys } from '../api/apiClient';
import { getSurveyTypeLabel } from '../utils/surveyTypeLabels';
import { getSurveyStatusLabel } from '../utils/surveyStatusLabels';
import './Surveys.css';

export default function Surveys() {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSurveys();
    }, []);

    const loadSurveys = async () => {
        try {
            setLoading(true);
            const data = await getSurveys();
            setSurveys(data);
            setError(null);
        } catch (error) {
            console.error('Failed to load surveys:', error);
            setError('Failed to load surveys. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            ACTIVE: { background: '#d1fae5', color: '#065f46' },
            DRAFT: { background: '#fef3c7', color: '#92400e' },
            COMPLETED: { background: '#dbeafe', color: '#1e40af' },
            PUBLISHED: { background: '#d1fae5', color: '#065f46' },
            CLOSED: { background: '#fee2e2', color: '#991b1b' },
            DEPRECATED: { background: '#f3f4f6', color: '#374151' }
        };
        return styles[status] || styles.DRAFT;
    };

    if (loading) {
        return <div className="loading">Loading surveys...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="surveys-page">
            <div className="page-header">
                <h2 className="page-title">Surveys</h2>
                {/* Read-only interface for now */}
            </div>

            <div className="table-container">
                {surveys.length === 0 ? (
                    <div className="empty-state">No surveys found.</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Options</th>
                            </tr>
                        </thead>
                        <tbody>
                            {surveys.map((survey) => (
                                <tr key={survey.id}>
                                    <td className="font-medium">{survey.title}</td>
                                    <td>
                                        <span className="type-badge">
                                            {getSurveyTypeLabel(survey.type)}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={getStatusBadge(survey.status)}
                                        >
                                            {getSurveyStatusLabel(survey.status)}
                                        </span>
                                    </td>
                                    <td>
                                        {survey.options ? survey.options.length : 0} options
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
