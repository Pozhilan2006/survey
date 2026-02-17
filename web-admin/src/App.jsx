import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import ApproverLayout from './layouts/ApproverLayout';

// Common routes
import Login from './routes/common/Login';

// Admin routes
import AdminDashboard from './routes/admin/Dashboard';
import SurveyList from './routes/admin/Surveys/SurveyList';
import SurveyForm from './routes/admin/Surveys/SurveyForm';

// Student routes
import StudentDashboard from './routes/student/Dashboard';
import MyCommitments from './routes/student/MyCommitments';

// Approver routes
import ApproverDashboard from './routes/approver/Dashboard';

const RoleBasedRedirect = () => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" />;

    switch (user.role) {
        case 'ADMIN':
            return <Navigate to="/admin/dashboard" />;
        case 'STUDENT':
            return <Navigate to="/student/dashboard" />;
        case 'APPROVER':
            return <Navigate to="/approver/dashboard" />;
        default:
            return <Navigate to="/login" />;
    }
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<RoleBasedRedirect />} />

                    {/* Admin Routes */}
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="surveys" element={<SurveyList />} />
                        <Route path="surveys/new" element={<SurveyForm />} />
                        <Route path="surveys/:id/edit" element={<SurveyForm />} />
                        <Route path="approvals" element={<div><h1>Approvals</h1><p>Admin approvals page</p></div>} />
                        <Route path="users" element={<div><h1>Users</h1><p>User management page</p></div>} />
                        <Route path="audit-logs" element={<div><h1>Audit Logs</h1><p>Audit logs page</p></div>} />
                    </Route>

                    {/* Student Routes */}
                    <Route
                        path="/student/*"
                        element={
                            <ProtectedRoute allowedRoles={['STUDENT']}>
                                <StudentLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<StudentDashboard />} />
                        <Route path="commitments" element={<MyCommitments />} />
                        <Route path="surveys" element={<div><h1>Available Surveys</h1><p>Browse surveys</p></div>} />
                        <Route path="submissions" element={<div><h1>My Submissions</h1><p>View your submissions</p></div>} />
                        <Route path="status" element={<div><h1>My Status</h1><p>Track your status</p></div>} />
                    </Route>

                    {/* Approver Routes */}
                    <Route
                        path="/approver/*"
                        element={
                            <ProtectedRoute allowedRoles={['APPROVER']}>
                                <ApproverLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<ApproverDashboard />} />
                        <Route path="queue" element={<div><h1>Approval Queue</h1><p>Pending approvals</p></div>} />
                        <Route path="history" element={<div><h1>Decision History</h1><p>Past decisions</p></div>} />
                    </Route>

                    {/* Unauthorized */}
                    <Route path="/unauthorized" element={<div><h1>Unauthorized</h1><p>You don't have permission to access this page.</p></div>} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
