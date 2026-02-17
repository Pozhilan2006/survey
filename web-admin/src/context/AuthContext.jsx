import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        console.log('🔄 AuthContext initialized, token:', token ? 'exists' : 'none');
        if (token) {
            verifyToken();
        } else {
            setLoading(false);
        }
    }, [token]);

    const verifyToken = async () => {
        console.log('🔍 Verifying token...');
        try {
            const response = await authAPI.verify();
            console.log('✅ Token verified, user:', response.data.user);
            setUser(response.data.user);
        } catch (error) {
            console.error('❌ Token verification failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        console.log('🔐 AuthContext.login called', { email });

        try {
            console.log('📡 Making API call to /auth/login...');
            const response = await authAPI.login(email, password);
            console.log('📥 API response received:', response.data);

            const { token: newToken, user: newUser } = response.data;

            console.log('💾 Storing token in localStorage...');
            localStorage.setItem('token', newToken);

            console.log('📝 Updating state...');
            setToken(newToken);
            setUser(newUser);

            console.log('✅ Login complete, returning user:', newUser);
            return newUser;
        } catch (error) {
            console.error('❌ Login error in AuthContext:', error);
            console.error('Error response:', error.response?.data);
            throw error;
        }
    };

    const logout = () => {
        console.log('🚪 Logging out...');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
