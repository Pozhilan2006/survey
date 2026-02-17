import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const ApproverLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <nav className="sidebar approver-sidebar">
                <div className="sidebar-header">
                    <h2>Approver Panel</h2>
                    <p className="user-email">{user?.email}</p>
                </div>
                <ul className="nav-menu">
                    <li><Link to="/approver/dashboard">Dashboard</Link></li>
                    <li><Link to="/approver/queue">Approval Queue</Link></li>
                    <li><Link to="/approver/history">Decision History</Link></li>
                </ul>
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </nav>
            <main className="content">
                <Outlet />
            </main>
        </div>
    );
};

export default ApproverLayout;
