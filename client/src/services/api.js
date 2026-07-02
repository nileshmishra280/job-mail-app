import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const analyzeJob = (jobText) => API.post('/analyze', { jobText });

export const sendMail = (data) => API.post('/send-mail', data);

export const getHistory = () => API.get('/history');

export const clearHistory = () => API.delete('/history');

export const getSettings = () => API.get('/settings');

export const saveSettings = (data) => API.post('/settings', data);

export const uploadResume = (formData) =>
  API.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getResume = () => API.get('/resume');

export const selectResume = (data) => API.post('/resume/select', data);

export const deleteResume = () => API.delete('/resume');

export default API;
