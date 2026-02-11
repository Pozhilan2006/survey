import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../api/apiClient';
import './AuditLogs.css';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getAuditLogs(100);
            setLogs(data);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
            setError('Failed to load audit logs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('CREATED') || action.includes('APPROVED')) {
            return '#10b981';
        }
        if (action.includes('REJECTED') || action.includes('DELETED')) {
            return '#ef4444';
        }
        if (action.includes('UPDATED') || action.includes('SUBMITTED')) {
            return '#f59e0b';
        }
        return '#6b7280';
    };

    const formatDetails = (details) => {
        if (!details) return '—';
        if (typeof details === 'string') return details;

        // Extract meaningful info from details object
        const { surveyTitle, participationId, studentUserId } = details;
        const parts = [];
        if (surveyTitle) parts.push(`Survey: ${surveyTitle}`);
        if (participationId) parts.push(`ID: ${participationId.substring(0, 8)}...`);
        if (studentUserId) parts.push(`User: ${studentUserId.substring(0, 8)}...`);

        return parts.length > 0 ? parts.join(' | ') : JSON.stringify(details).substring(0, 50);
    };

    if (loading) {
        return <div className="loading">Loading audit logs...</div>;
    }

    if (error) {
        return (
            <div className="error-state">
                <p>{error}</p>
                <button onClick={loadLogs}>Retry</button>
            </div>
        );
    }

    return (
        <div className="audit-logs-page">
            <div className="page-header">
                <h2 className="page-title">Audit Logs</h2>
                <button onClick={loadLogs} className="refresh-btn">
                    Refresh
                </button>
            </div>

            {logs.length === 0 ? (
                <div className="empty-state">
                    <p>No audit logs found</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td className="text-gray timestamp">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="font-medium">
                                        {log.userEmail || log.userId?.substring(0, 8) || 'System'}
                                    </td>
                                    <td>
                                        <span
                                            className="action-badge"
                                            style={{ color: getActionColor(log.action) }}
                                        >
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="details">{formatDetails(log.details)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
