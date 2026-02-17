import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessToken, setAccessToken] = useState(null);

    useEffect(() => {
        console.log('🔄 AuthContext initialized');
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            console.log('🔄 Refresh token found, attempting to restore session...');
            restoreSession();
        } else {
            console.log('📭 No refresh token found');
            setLoading(false);
        }
    }, []);

    const restoreSession = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            const response = await authAPI.refresh(refreshToken);
            console.log('✅ Session restored:', response.data);

            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: userData } = response.data;
            setAccessToken(newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            localStorage.setItem('accessToken', newAccessToken); // Store for axios interceptor
            setUser(userData);
        } catch (error) {
            console.error('❌ Session restoration failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

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

            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser } = response.data;

            console.log('💾 Storing tokens...');
            setAccessToken(newAccessToken);
            localStorage.setItem('accessToken', newAccessToken); // Store for axios interceptor
            localStorage.setItem('refreshToken', newRefreshToken);

            console.log('📝 Updating state...');
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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAccessToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, accessToken }}>
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
