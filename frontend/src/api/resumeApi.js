import { uploadClient } from './client';

export async function uploadResume(formData) {
    const response = await uploadClient.post('/resume', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
}
