import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

console.log('🌐 Axios base URL:', API_BASE_URL);

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor - add token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

// Response interceptor - handle errors
axiosInstance.interceptors.response.use(
    (response) => {
        console.log('✅ Response received:', response.config.url, response.status);
        return response;
    },
    (error) => {
        console.error('❌ Response error:', error.config?.url, error.response?.status);
        if (error.response?.status === 401) {
            console.log('🚫 401 Unauthorized - clearing token and redirecting to login');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
