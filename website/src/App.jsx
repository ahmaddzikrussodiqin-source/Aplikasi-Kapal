import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DaftarKapal from './pages/DaftarKapal';
import KapalMasuk from './pages/KapalMasuk';
import Dokumen from './pages/Dokumen';
import Profile from './pages/Profile';
import ManageUsers from './pages/ManageUsers';

function ProtectedRoute({ children, requireModerator }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return React.createElement('div', { className: 'min-h-screen flex items-center justify-center' },
      React.createElement('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600' })
    );
  }

  if (!token) {
    return React.createElement(Navigate, { to: '/login' });
  }

  if (requireModerator && user?.role !== 'Moderator') {
    return React.createElement(Navigate, { to: '/' });
  }

  return children;
}

function AppRoutes() {
  const { token } = useAuth();

  return React.createElement(Routes, null,
    React.createElement(Route, { path: '/login', element: token ? React.createElement(Navigate, { to: '/' }) : React.createElement(Login) }),
    React.createElement(Route, { path: '/register', element: token ? React.createElement(Navigate, { to: '/' }) : React.createElement(Register) }),
    React.createElement(Route, { path: '/', element: React.createElement(ProtectedRoute, null, React.createElement(Dashboard)) }),
    React.createElement(Route, { path: '/daftar-kapal', element: React.createElement(ProtectedRoute, null, React.createElement(DaftarKapal)) }),
    React.createElement(Route, { path: '/kapal-masuk', element: React.createElement(ProtectedRoute, null, React.createElement(KapalMasuk)) }),
    React.createElement(Route, { path: '/dokumen', element: React.createElement(ProtectedRoute, null, React.createElement(Dokumen)) }),
    React.createElement(Route, { path: '/profile', element: React.createElement(ProtectedRoute, null, React.createElement(Profile)) }),
    React.createElement(Route, { path: '/manage-users', element: React.createElement(ProtectedRoute, { requireModerator: true }, React.createElement(ManageUsers)) })
  );
}

function App() {
  return React.createElement(AuthProvider, null,
    React.createElement(Router, null, React.createElement(AppRoutes))
  );
}

export default App;
