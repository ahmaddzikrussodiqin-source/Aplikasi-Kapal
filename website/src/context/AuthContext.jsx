import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import API_BASE_URL from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Auto-logout timeout: 60 minutes in milliseconds
const IDLE_TIMEOUT = 60 * 60 * 1000; // 60 minutes

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef(null);

  // Function to update last active timestamp
  const updateLastActive = useCallback(() => {
    if (token) {
      localStorage.setItem('lastActive', Date.now().toString());
    }
  }, [token]);

  // Function to check if session has expired
  const checkSessionExpired = useCallback(() => {
    if (!token) return false;
    
    const lastActive = localStorage.getItem('lastActive');
    if (!lastActive) {
      // If no lastActive timestamp, set it now
      localStorage.setItem('lastActive', Date.now().toString());
      return false;
    }
    
    const timeSinceLastActive = Date.now() - parseInt(lastActive, 10);
    return timeSinceLastActive > IDLE_TIMEOUT;
  }, [token]);

  // Function to handle logout
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActive');
    setToken(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    
    // Clear idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, [socket]);

  // Function to reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (!token) return;
    
    updateLastActive();
    
    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    
    // Set new timer
    idleTimerRef.current = setTimeout(() => {
      if (checkSessionExpired()) {
        console.log('Auto-logout: User idle for 60 minutes');
        logout();
        // Optionally redirect to login page
        window.location.href = '/login';
      }
    }, IDLE_TIMEOUT);
  }, [token, updateLastActive, checkSessionExpired, logout]);

  // Setup event listeners for user activity
  useEffect(() => {
    if (!token) return;

    // Check if session already expired on page load
    if (checkSessionExpired()) {
      logout();
      return;
    }

    // Set initial lastActive timestamp
    updateLastActive();

    // Setup idle timer
    resetIdleTimer();

    // Add event listeners for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetIdleTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [token, checkSessionExpired, updateLastActive, resetIdleTimer, logout]);

  useEffect(() => {
    if (token) {
      const userData = JSON.parse(localStorage.getItem('user') || 'null');
      setUser(userData);
      
      // Initialize socket connection
      const newSocket = io(API_BASE_URL, {
        auth: { token },
      });
      
      newSocket.on('connect', () => {
        console.log('Socket connected');
      });
      
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      
      setSocket(newSocket);
    }
    setLoading(false);
  }, [token]);

  const login = async (userId, password) => {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('lastActive', Date.now().toString());
      setToken(data.data.token);
      setUser(data.data.user);
      // Reset idle timer after login
      resetIdleTimer();
    }
    
    return data;
  };

  const register = async (userId, password, nama, role) => {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    const data = await response.json();
    return data;
  };

  const isModerator = user?.role === 'Moderator';
  const isSupervisi = user?.role === 'Supervisi' || isModerator;
  const isMember = user?.role === 'Member' || isSupervisi;

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      socket,
      loading,
      login, 
      register, 
      logout,
      isModerator,
      isSupervisi,
      isMember
    }}>
      {children}
    </AuthContext.Provider>
  );
};

