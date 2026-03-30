const API_BASE = 'http://localhost:8080';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('bank-app-token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    localStorage.removeItem('bank-app-token');
    localStorage.removeItem('bank-app-user');
    window.location.reload();
    return;
  }

  return response;
}

export async function loginApi(email, password) {
  const response = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Login failed');
  }
  return response.json();
}

export async function fetchBranches() {
  const response = await apiRequest('/api/branches');
  if (!response.ok) {
    throw new Error('Failed to fetch branches');
  }
  return response.json();
}

export async function fetchTopics() {
  const response = await apiRequest('/api/topics');
  if (!response.ok) {
    throw new Error('Failed to fetch topics');
  }
  return response.json();
}

export async function registerApi(email, password, displayName) {
  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Registration failed');
  }
  return response.json();
}
