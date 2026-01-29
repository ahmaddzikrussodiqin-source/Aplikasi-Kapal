import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, isModerator, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Status Kapal</h1>
          <div className="flex items-center gap-4">
            <Link to="/profile" className="text-sm hover:underline cursor-pointer">
              {user?.nama || user?.userId} ({user?.role})
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Daftar Kapal */}
          <Link to="/daftar-kapal" className="card hover:shadow-xl transition-shadow cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-full group-hover:bg-blue-200 transition-colors">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Daftar Kapal</h2>
                <p className="text-gray-500 text-sm">Kelola data kapal</p>
              </div>
            </div>
          </Link>

          {/* Kapal Masuk */}
          <Link to="/kapal-masuk" className="card hover:shadow-xl transition-shadow cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-4 rounded-full group-hover:bg-green-200 transition-colors">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Status Kerja Kapal</h2>
                <p className="text-gray-500 text-sm">Input data kapal baru</p>
              </div>
            </div>
          </Link>

          {/* Dokumen Kapal */}
          <Link to="/dokumen" className="card hover:shadow-xl transition-shadow cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 p-4 rounded-full group-hover:bg-yellow-200 transition-colors">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Dokumen Kapal</h2>
                <p className="text-gray-500 text-sm">Kelola dokumen kapal</p>
              </div>
            </div>
          </Link>



          {/* Kelola User - Only for Moderator */}
          {isModerator && (
            <Link to="/manage-users" className="card hover:shadow-xl transition-shadow cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="bg-red-100 p-4 rounded-full group-hover:bg-red-200 transition-colors">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Kelola User</h2>
                  <p className="text-gray-500 text-sm">Manajemen pengguna</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">© 2025 Status Kapal. Ship Management System</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
