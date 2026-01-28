import { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import API_BASE_URL from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setToken(data.data.token);
      setUser(data.data.user);
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

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (socket) {
      socket.disconnect();
    }
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

