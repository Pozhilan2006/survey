import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

export default function Layout({ children }) {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Survey Admin</h2>
                </div>
                <nav className="sidebar-nav">
                    <Link
                        to="/"
                        className={`nav-item ${isActive('/') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">📊</span>
                        Dashboard
                    </Link>
                    <Link
                        to="/surveys"
                        className={`nav-item ${isActive('/surveys') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">📝</span>
                        Surveys
                    </Link>
                    <Link
                        to="/approvals"
                        className={`nav-item ${isActive('/approvals') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">✅</span>
                        Approvals
                    </Link>
                    <Link
                        to="/users"
                        className={`nav-item ${isActive('/users') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">👥</span>
                        Users
                    </Link>
                    <Link
                        to="/audit-logs"
                        className={`nav-item ${isActive('/audit-logs') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">📜</span>
                        Audit Logs
                    </Link>
                </nav>
            </aside>

            <div className="main-content">
                <header className="header">
                    <h1 className="page-title">College Survey System</h1>
                    <button className="logout-btn">
                        {/* TODO: Implement logout functionality */}
                        Logout
                    </button>
                </header>

                <main className="content">
                    {children}
                </main>
            </div>
        </div>
    );
}
