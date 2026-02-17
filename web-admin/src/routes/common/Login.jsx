import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('🔐 Login attempt started', { email });

        setError('');
        setLoading(true);

        try {
            console.log('📡 Calling login API...');
            const user = await login(email, password);
            console.log('✅ Login successful!', user);

            // Role-based redirect
            let redirectPath;
            switch (user.role) {
                case 'ADMIN':
                    redirectPath = '/admin/dashboard';
                    break;
                case 'STUDENT':
                    redirectPath = '/student/dashboard';
                    break;
                case 'APPROVER':
                    redirectPath = '/approver/dashboard';
                    break;
                default:
                    redirectPath = '/';
            }

            console.log('🚀 Redirecting to:', redirectPath);
            navigate(redirectPath);
        } catch (err) {
            console.error('❌ Login failed:', err);
            const errorMessage = err.response?.data?.error?.message || err.message || 'Login failed. Please try again.';
            console.error('Error message:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
            console.log('🏁 Login attempt finished');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Survey System</h1>
                <p className="login-subtitle">Sign in to continue</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" disabled={loading} className="login-button">
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="default-credentials">
                    <p><strong>Default credentials:</strong></p>
                    <p>Admin: admin@survey.com / admin123</p>
                    <p>Student: student@survey.com / student123</p>
                    <p>Approver: approver@survey.com / approver123</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
