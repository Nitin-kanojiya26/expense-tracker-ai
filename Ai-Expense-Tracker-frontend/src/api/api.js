const API_BASE_URL = 'http://localhost:8080/api';

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
      throw new Error('Unauthorized');
    }
    throw new Error('Incorrect username/email or password.');
  }

  if (!response.ok) {
    const rawError = await response.text();
    let friendlyMessage = 'Something went wrong';
    try {
      if (rawError.trim().startsWith('{') || rawError.trim().startsWith('[')) {
        const parsedError = JSON.parse(rawError);
        if (parsedError.message) friendlyMessage = parsedError.message;
      } else if (rawError) {
        friendlyMessage = rawError;
      }
    } catch (e) {
      console.error("Error evaluating response text stream", e);
    }
    throw new Error(friendlyMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

// 3. SECURE AUTH PATHWAYS
export const login = async (username, password) => {
  const res = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse(res);
};

export const register = async (userData) => {
  const res = await fetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: userData.fullName,
      username: userData.username,
      email: userData.email,
      password: userData.password
    }),
  });
  return handleResponse(res);
};

// 4. LIVE DATABASE CATEGORIES STREAM
export const getCategories = async (userId) => {
  const res = await fetch(`${API_BASE_URL}/categories/user/${userId}`, {
    headers: { ...getAuthHeader() }
  });
  return handleResponse(res);
};

// 5. SECURE TRANSACTION LEDGER HANDLERS
export const getExpenses = async (userId, page = 0, size = 10) => {
  const res = await fetch(`${API_BASE_URL}/expenses/user/${userId}?page=${page}&size=${size}`, {
    headers: { ...getAuthHeader() }
  });
  return handleResponse(res);
};

export const getAllExpenses = async (userId) => {
  const res = await fetch(`${API_BASE_URL}/expenses/user/${userId}`, {
    headers: { ...getAuthHeader() }
  });
  return handleResponse(res);
};

export const createExpense = async (userId, expense) => {
  const { categoryId, ...payload } = expense;
  let url = `${API_BASE_URL}/expenses/user/${userId}`;
  if (categoryId) url += `?categoryId=${categoryId}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const updateExpense = async (id, expense) => {
  const { categoryId, ...payload } = expense;
  let url = `${API_BASE_URL}/expenses/${id}`;
  if (categoryId) url += `?categoryId=${categoryId}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
};

export const deleteExpense = async (id) => {
  const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  return handleResponse(res);
};

// 6. COGNITIVE AI PROCESSING METHODS
export const getAIInsights = async (userId) => {
  const res = await fetch(`${API_BASE_URL}/ai/insights?userId=${userId}`, {
    headers: { ...getAuthHeader() },
  });
  return handleResponse(res);
};

export const getBudgetPrediction = async (userId) => {
  const res = await fetch(`${API_BASE_URL}/ai/predict?userId=${userId}`, {
    headers: { ...getAuthHeader() },
  });
  return handleResponse(res);
};

export const askAI = async (userId, question) => {
  const res = await fetch(`${API_BASE_URL}/ai/query?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ question }),
  });
  return handleResponse(res);
};

export const suggestCategory = async (description) => {
  const res = await fetch(`${API_BASE_URL}/ai/suggest-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ description }),
  });
  return handleResponse(res);
};

// 7. PROFILE ENDPOINTS
export const updateUser = async (userId, userData) => {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(userData),
  });
  return handleResponse(res);
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const res = await fetch(`${API_BASE_URL}/users/${userId}/change-password`, {
    method: 'PUT', 
    headers: { 
      'Content-Type': 'application/json', 
      ...getAuthHeader() 
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse(res);
};
export const deleteAccount = async (userId) => {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: { ...getAuthHeader() },
  });
  return handleResponse(res);
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
