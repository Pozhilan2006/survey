import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const StudentLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <nav className="sidebar student-sidebar">
                <div className="sidebar-header">
                    <h2>Student Portal</h2>
                    <p className="user-email">{user?.email}</p>
                </div>
                <ul className="nav-menu">
                    <li><Link to="/student/dashboard">Dashboard</Link></li>
                    <li><Link to="/student/commitments">My Commitments</Link></li>
                    <li><Link to="/student/surveys">Available Surveys</Link></li>
                    <li><Link to="/student/submissions">My Submissions</Link></li>
                    <li><Link to="/student/status">My Status</Link></li>
                </ul>
                <button onClick={handleLogout} className="logout-button">Logout</button>
            </nav>
            <main className="content">
                <Outlet />
            </main>
        </div>
    );
};

export default StudentLayout;
