import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/axios';
import './Surveys.css';

const SurveyList = () => {
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadSurveys();
    }, []);

    const loadSurveys = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get('/surveys');
            setSurveys(response.data.surveys || []);
        } catch (err) {
            setError('Failed to load surveys');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (surveyId) => {
        if (!window.confirm('Are you sure you want to delete this survey?')) {
            return;
        }

        try {
            await axiosInstance.delete(`/admin/surveys/${surveyId}`);
            setSurveys(surveys.filter(s => s.id !== surveyId));
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Failed to delete survey');
        }
    };

    if (loading) return <div className="loading">Loading surveys...</div>;

    return (
        <div className="survey-list-container">
            <div className="survey-list-header">
                <h1>Surveys</h1>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/admin/surveys/new')}
                >
                    + Create Survey
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {surveys.length === 0 ? (
                <div className="empty-state">
                    <p>No surveys yet. Create your first survey!</p>
                </div>
            ) : (
                <div className="survey-grid">
                    {surveys.map(survey => (
                        <div key={survey.id} className="survey-card">
                            <div className="survey-card-header">
                                <h3>{survey.title}</h3>
                                <span className={`badge badge-${survey.status.toLowerCase()}`}>
                                    {survey.status}
                                </span>
                            </div>
                            <div className="survey-card-body">
                                <p><strong>Type:</strong> {survey.type}</p>
                                <p><strong>Options:</strong> {survey.options?.length || 0}</p>
                            </div>
                            <div className="survey-card-actions">
                                <button
                                    className="btn-secondary"
                                    onClick={() => navigate(`/admin/surveys/${survey.id}/edit`)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => handleDelete(survey.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SurveyList;
