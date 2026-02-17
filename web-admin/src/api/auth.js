import axiosInstance from './axios';

export const authAPI = {
    login: (email, password) =>
        axiosInstance.post('/auth/login', { email, password }),

    register: (email, password, role) =>
        axiosInstance.post('/auth/register', { email, password, role }),

    verify: () =>
        axiosInstance.get('/auth/verify')
};
