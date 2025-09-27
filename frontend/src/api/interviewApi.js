import { apiClient } from './client';

export async function startInterview(payload) {
    const response = await apiClient.post('/interviews', payload);
    return response.data;
}

export async function submitAnswer(sessionId, payload) {
    const response = await apiClient.post(`/interviews/${sessionId}/answers`, payload);
    return response.data;
}

export async function fetchSession(sessionId) {
    const response = await apiClient.get(`/interviews/${sessionId}`);
    return response.data;
}

export async function finalizeSession(sessionId) {
    const response = await apiClient.post(`/interviews/${sessionId}/finish`);
    return response.data;
}
