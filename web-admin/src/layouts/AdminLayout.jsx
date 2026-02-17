import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <nav className="sidebar admin-sidebar">
                <div className="sidebar-header">
                    <h2>Admin Panel</h2>
                    <p className="user-email">{user?.email}</p>
                </div>
                <ul className="nav-menu">
                    <li><Link to="/admin/dashboard">Dashboard</Link></li>
                    <li><Link to="/admin/surveys">Surveys</Link></li>
                    <li><Link to="/admin/approvals">Approvals</Link></li>
                    <li><Link to="/admin/users">Users</Link></li>
                    <li><Link to="/admin/audit-logs">Audit Logs</Link></li>
                </ul>
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </nav>
            <main className="content">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
