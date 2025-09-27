import { apiClient } from './client';

export async function fetchCandidates(params = {}) {
    const response = await apiClient.get('/candidates', { params });
    return response.data;
}

export async function fetchCandidateDetail(candidateId) {
    const response = await apiClient.get(`/candidates/${candidateId}`);
    return response.data;
}
