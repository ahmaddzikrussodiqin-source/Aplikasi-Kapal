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

const ProtectedRoute = ({ children, requireModerator = false }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requireModerator && user?.role !== 'Moderator') {
    return <Navigate to="/" />;
  }

  return children;
};

const AppRoutes = () => {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/" /> : <Register />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/daftar-kapal" element={
        <ProtectedRoute>
          <DaftarKapal />
        </ProtectedRoute>
      } />
      
      <Route path="/kapal-masuk" element={
        <ProtectedRoute>
          <KapalMasuk />
        </ProtectedRoute>
      } />
      
      <Route path="/dokumen" element={
        <ProtectedRoute>
          <Dokumen />
        </ProtectedRoute>
      } />
      
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/manage-users" element={
        <ProtectedRoute requireModerator>
          <ManageUsers />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

