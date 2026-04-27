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

export async function fetchAllAppointments() {
  const response = await apiRequest('/api/appointments');
  if (!response.ok) {
    throw new Error('Failed to fetch appointments');
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

// -------------------------------------------------------------------------
// Appointment API
// -------------------------------------------------------------------------

export async function bookAppointment(dto) {
  const response = await apiRequest('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to book appointment');
  }
  return response.json();
}

export async function fetchAppointmentsByEmail(email) {
  const response = await apiRequest(`/api/appointments/customer?email=${encodeURIComponent(email)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch appointments');
  }
  return response.json();
}

export async function fetchAppointmentsByBranch(branchId) {
  const response = await apiRequest(`/api/appointments/branch/${branchId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch branch appointments');
  }
  return response.json();
}

export async function cancelAppointment(id) {
  const response = await apiRequest(`/api/appointments/${id}/cancel`, {
    method: 'PUT',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to cancel appointment');
  }
  return response.json();
}

export async function rescheduleAppointment(id, newDateTime) {
  const response = await apiRequest(`/api/appointments/${id}/reschedule`, {
    method: 'PUT',
    body: JSON.stringify(newDateTime),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to reschedule appointment');
  }
  return response.json();
}
