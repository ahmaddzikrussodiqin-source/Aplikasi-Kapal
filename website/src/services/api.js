// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Auth API
export const authAPI = {
  login: async (userId, password) => {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    return response.json();
  },

  register: async (userId, password) => {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    return response.json();
  },
};

// User API
export const userAPI = {
  getAll: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  create: async (token, user) => {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(user),
    });
    return response.json();
  },

  update: async (token, userId, user) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(user),
    });
    return response.json();
  },

  delete: async (token, userId) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};

// Kapal (Ship) API
export const kapalAPI = {
  getAll: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getById: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  create: async (token, kapal) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(kapal),
    });
    return response.json();
  },

  update: async (token, id, kapal) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(kapal),
    });
    return response.json();
  },

  delete: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};

// Kapal Masuk (Ship Status) API
export const kapalMasukAPI = {
  getAll: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal-masuk`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  getById: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal-masuk/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  create: async (token, kapalMasuk) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(kapalMasuk),
    });
    return response.json();
  },

  update: async (token, id, kapalMasuk) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal-masuk/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(kapalMasuk),
    });
    return response.json();
  },

  delete: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/api/kapal-masuk/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};

// Dokumen API
export const dokumenAPI = {
  getByKapalId: async (token, kapalId) => {
    const response = await fetch(`${API_BASE_URL}/api/dokumen/kapal/${kapalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },

  create: async (token, dokumen) => {
    const response = await fetch(`${API_BASE_URL}/api/dokumen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dokumen),
    });
    return response.json();
  },

  update: async (token, id, dokumen) => {
    const response = await fetch(`${API_BASE_URL}/api/dokumen/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dokumen),
    });
    return response.json();
  },

  delete: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/api/dokumen/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};

// File Upload API
export const uploadAPI = {
  upload: async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  },
};

export default API_BASE_URL;

