// API Configuration
// Backend Railway URL (Aplikasi-Kapal service) - serves API and files
// Frontend Railway URL (website service) - serves React app

// Mode: 'production' (Railway) or 'development' (localhost)
const APP_MODE = import.meta.env.VITE_APP_MODE || 'production';

// Backend service URL (for API calls and file access)
const BACKEND_RAILWAY_URL = import.meta.env.VITE_BACKEND_URL || 'https://aplikasi-kapal-production.up.railway.app';
// Frontend service URL (for reference)
const FRONTEND_RAILWAY_URL = import.meta.env.VITE_FRONTEND_URL || 'https://website-production.up.railway.app';
const LOCAL_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Use LOCAL_URL for development mode, BACKEND_RAILWAY_URL for production
const API_BASE_URL = APP_MODE === 'development' ? LOCAL_URL : BACKEND_RAILWAY_URL;

// Export variables for use across the app
export { APP_MODE, LOCAL_URL, BACKEND_RAILWAY_URL, FRONTEND_RAILWAY_URL };
export default API_BASE_URL;
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

// Status Kerja Kapal (Ship Status) API
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

  uploadMultiple: async (token, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await fetch(`${API_BASE_URL}/api/upload-multiple`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  },
};

// Migration API
export const migrationAPI = {
  migrateFileUrls: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/migrate-file-urls`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};

// Backup API
export const backupAPI = {
  createBackup: async (token) => {
    const response = await fetch(`${API_BASE_URL}/api/backup`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Backup failed');
    }

    // Return the response directly for file download
    return response;
  },
};

