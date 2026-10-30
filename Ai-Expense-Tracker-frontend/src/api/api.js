import { getFriendlyErrorMessage } from '../lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// 1. DYNAMIC CHROMATIC DESIGN PALETTE
const COLOR_PALETTE = ['#f97316', '#3b82f6', '#06b6d4', '#6366f1', '#ec4899', '#8b5cf6', '#ef4444', '#eab308', '#22c55e', '#14b8a6', '#10b981'];

export const getCategoryColor = (name) => {
  if (!name) return '#6b7280';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

// 2. CORE TRANSLATION INTERCEPTORS
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
      throw new Error('Your session has expired. Please sign in again.');
    }
    throw new Error('Incorrect username/email or password.');
  }

  if (!response.ok) {
    const rawError = await response.text();
    let message = 'Something went wrong. Please try again.';
    try {
      if (rawError.trim().startsWith('{') || rawError.trim().startsWith('[')) {
        const parsedError = JSON.parse(rawError);
        if (parsedError.message) {
          message = parsedError.message;
        } else if (parsedError.error) {
          message = parsedError.error;
        } else if (parsedError.errors && typeof parsedError.errors === 'object') {
          message = Object.values(parsedError.errors).join(', ');
        }
      } else if (rawError) {
        message = rawError;
      }
    } catch (e) {
      console.error("Error evaluating response text stream", e);
    }
    throw new Error(getFriendlyErrorMessage(message));
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

const apiFetch = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    return await handleResponse(res);
  } catch (err) {
    throw new Error(getFriendlyErrorMessage(err));
  }
};

// 3. SECURE AUTH PATHWAYS
export const login = async (username, password) => {
  return apiFetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
};

export const sendOtp = async (email) => {
  return apiFetch(`${API_BASE_URL}/users/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
};

export const register = async (userData) => {
  return apiFetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: userData.fullName,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      otp: userData.otp
    }),
  });
};

export const resetPassword = async (email, otp, newPassword) => {
  return apiFetch(`${API_BASE_URL}/users/forgot-password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, newPassword }),
  });
};

// 4. LIVE DATABASE CATEGORIES STREAM
export const getCategories = async (userId) => {
  return apiFetch(`${API_BASE_URL}/categories/user/${userId}`, {
    headers: { ...getAuthHeader() }
  });
};

// 5. SECURE TRANSACTION LEDGER HANDLERS
export const getExpenses = async (userId, page = 0, size = 10) => {
  return apiFetch(`${API_BASE_URL}/expenses/user/${userId}?page=${page}&size=${size}`, {
    headers: { ...getAuthHeader() }
  });
};

export const getAllExpenses = async (userId) => {
  return apiFetch(`${API_BASE_URL}/expenses/user/${userId}`, {
    headers: { ...getAuthHeader() }
  });
};

export const createExpense = async (userId, expense) => {
  const { categoryId, ...payload } = expense;
  let url = `${API_BASE_URL}/expenses/user/${userId}`;
  if (categoryId) url += `?categoryId=${categoryId}`;

  return apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(payload),
  });
};

export const updateExpense = async (id, expense) => {
  const { categoryId, ...payload } = expense;
  let url = `${API_BASE_URL}/expenses/${id}`;
  if (categoryId) url += `?categoryId=${categoryId}`;

  return apiFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(payload),
  });
};

export const deleteExpense = async (id) => {
  return apiFetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
};

// 6. COGNITIVE AI PROCESSING METHODS
export const getAIInsights = async (userId) => {
  return apiFetch(`${API_BASE_URL}/ai/insights?userId=${userId}`, {
    headers: { ...getAuthHeader() },
  });
};

export const getBudgetPrediction = async (userId) => {
  return apiFetch(`${API_BASE_URL}/ai/predict?userId=${userId}`, {
    headers: { ...getAuthHeader() },
  });
};

export const askAI = async (userId, question) => {
  return apiFetch(`${API_BASE_URL}/ai/query?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ question }),
  });
};

export const suggestCategory = async (description) => {
  return apiFetch(`${API_BASE_URL}/ai/suggest-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ description }),
  });
};

// 7. PROFILE ENDPOINTS
export const updateUser = async (userId, userData) => {
  return apiFetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(userData),
  });
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  return apiFetch(`${API_BASE_URL}/users/${userId}/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

export const deleteAccount = async (userId) => {
  return apiFetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
};

export const generateUniqueColor = (str) => {
  if (!str) return 'hsl(0, 0%, 50%)';
  let hash = 0;
  const cleanStr = str.trim().toLowerCase();

  for (let i = 0; i < cleanStr.length; i++) {
    hash = cleanStr.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Deterministic Hue generation (0-360) with vibrant saturation
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 50%)`;
};
