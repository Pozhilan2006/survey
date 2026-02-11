import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Surveys from './pages/Surveys';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';

export default function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/surveys" element={<Surveys />} />
                    <Route path="/approvals" element={<Approvals />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
