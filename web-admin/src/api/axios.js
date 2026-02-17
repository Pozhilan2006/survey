import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

console.log('🌐 Axios base URL:', API_BASE_URL);

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - add accessToken
axiosInstance.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
            console.log('🔑 Added Authorization header to request:', config.url);
        } else {
            console.log('📤 Request without token:', config.url);
        }
        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors and auto-refresh
axiosInstance.interceptors.response.use(
    (response) => {
        console.log('✅ Response received:', response.config.url, response.status);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        console.error('❌ Response error:', error.config?.url, error.response?.status);

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                console.log('🔄 Attempting token refresh...');
                const refreshToken = localStorage.getItem('refreshToken');

                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

                console.log('✅ Token refreshed successfully');
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.log('🚫 Token refresh failed - clearing tokens and redirecting to login');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
