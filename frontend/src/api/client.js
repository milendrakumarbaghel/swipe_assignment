import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const uploadClient = axios.create({
    baseURL: apiBaseUrl,
});

// Interceptor to log errors in development
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.error('API error', error);
        }
        return Promise.reject(error);
    }
);

uploadClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.error('Upload error', error);
        }
        return Promise.reject(error);
    }
);
