import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../api/apiClient';
import './AuditLogs.css';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        try {
            // TODO: Replace with real API call
            const data = await getAuditLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('CREATED') || action.includes('GRANTED')) {
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

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="audit-logs-page">
            <h2 className="page-title">Audit Logs</h2>

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
                                <td className="font-medium">{log.user}</td>
                                <td>
                                    <span
                                        className="action-badge"
                                        style={{ color: getActionColor(log.action) }}
                                    >
                                        {log.action}
                                    </span>
                                </td>
                                <td className="details">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
