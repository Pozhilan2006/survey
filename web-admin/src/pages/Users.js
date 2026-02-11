import React, { useState, useEffect } from 'react';
import { getUsers } from '../api/apiClient';
import './Users.css';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            // TODO: Replace with real API call
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadge = (role) => {
        const styles = {
            STUDENT: { background: '#dbeafe', color: '#1e40af' },
            TEACHER: { background: '#ddd6fe', color: '#5b21b6' },
            ADMIN: { background: '#fce7f3', color: '#9f1239' }
        };
        return styles[role] || styles.STUDENT;
    };

    const getStatusBadge = (status) => {
        const styles = {
            ACTIVE: { background: '#d1fae5', color: '#065f46' },
            INACTIVE: { background: '#f3f4f6', color: '#6b7280' }
        };
        return styles[status] || styles.ACTIVE;
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="users-page">
            <h2 className="page-title">Users</h2>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="font-medium">{user.name}</td>
                                <td className="text-gray">{user.email}</td>
                                <td>
                                    <span
                                        className="role-badge"
                                        style={getRoleBadge(user.role)}
                                    >
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className="status-badge"
                                        style={getStatusBadge(user.status)}
                                    >
                                        {user.status}
                                    </span>
                                </td>
                                <td className="text-gray">
                                    {new Date(user.lastActive).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
