import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalAPI } from '../services/api';

const DaftarKapal = () => {
  const { token } = useAuth();
  const [kapalList, setKapalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [selectedKapal, setSelectedKapal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({
    nama: '',
    namaPemilik: '',
    tandaSelar: '',
    tandaPengenal: '',
    beratKotor: '',
    beratBersih: '',
    merekMesin: '',
    nomorSeriMesin: '',
    jenisAlatTangkap: '',
  });

  useEffect(() => {
    loadKapalList();
  }, [token]);

  const loadKapalList = async () => {
    try {
      const data = await kapalAPI.getAll(token);
      if (data.success) {
        setKapalList(data.data || []);
      }
    } catch (error) {
      console.error('Error loading kapal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingKapal) {
        response = await kapalAPI.update(token, editingKapal.id, formData);
      } else {
        response = await kapalAPI.create(token, { ...formData, listDokumen: [] });
      }

      if (response.success) {
        setShowModal(false);
        setEditingKapal(null);
        setFormData({
          nama: '',
          namaPemilik: '',
          tandaSelar: '',
          tandaPengenal: '',
          beratKotor: '',
          beratBersih: '',
          merekMesin: '',
          nomorSeriMesin: '',
          jenisAlatTangkap: '',
        });
        loadKapalList();
      }
    } catch (error) {
      console.error('Error saving kapal:', error);
    }
  };

  const handleEdit = (kapal) => {
    setEditingKapal(kapal);
    setFormData({
      nama: kapal.nama || '',
      namaPemilik: kapal.namaPemilik || '',
      tandaSelar: kapal.tandaSelar || '',
      tandaPengenal: kapal.tandaPengenal || '',
      beratKotor: kapal.beratKotor || '',
      beratBersih: kapal.beratBersih || '',
      merekMesin: kapal.merekMesin || '',
      nomorSeriMesin: kapal.nomorSeriMesin || '',
      jenisAlatTangkap: kapal.jenisAlatTangkap || '',
    });
    setShowModal(true);
  };

  const handleViewDetail = (kapal) => {
    setSelectedKapal(kapal);
    setShowDetailModal(true);
  };

  const handleDelete = async (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      const response = await kapalAPI.delete(token, deleteConfirmId);
      if (response.success) {
        loadKapalList();
      }
    } catch (error) {
      console.error('Error deleting kapal:', error);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const filteredKapal = kapalList.filter(kapal =>
    kapal.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kapal.namaPemilik?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kapal.tandaSelar?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:bg-blue-700 p-2 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">Daftar Kapal</h1>
          </div>
          <button
            onClick={() => {
              setEditingKapal(null);
              setFormData({
                nama: '',
                namaPemilik: '',
                tandaSelar: '',
                tandaPengenal: '',
                beratKotor: '',
                beratBersih: '',
                merekMesin: '',
                nomorSeriMesin: '',
                jenisAlatTangkap: '',
              });
              setShowModal(true);
            }}
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Kapal
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari kapal berdasarkan nama, pemilik, atau tanda selar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Kapal List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredKapal.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">Tidak ada data kapal</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredKapal.map((kapal) => (
              <div key={kapal.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{kapal.nama}</h3>
                          <p className="text-gray-500 text-sm">Pemilik: {kapal.namaPemilik || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Tanda Selar</span>
                          <p className="font-medium text-gray-800">{kapal.tandaSelar || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Tanda Pengenal</span>
                          <p className="font-medium text-gray-800">{kapal.tandaPengenal || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Berat Kotor (GT)</span>
                          <p className="font-medium text-gray-800">{kapal.beratKotor || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Berat Bersih (NT)</span>
                          <p className="font-medium text-gray-800">{kapal.beratBersih || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Merek Mesin</span>
                          <p className="font-medium text-gray-800">{kapal.merekMesin || '-'}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase tracking-wide">No. Seri Mesin</span>
                          <p className="font-medium text-gray-800">{kapal.nomorSeriMesin || '-'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Alat Tangkap</span>
                          <p className="font-medium text-gray-800">{kapal.jenisAlatTangkap || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleViewDetail(kapal)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                        title="Lihat Detail"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detail
                      </button>
                      <button
                        onClick={() => handleEdit(kapal)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(kapal.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">
                {editingKapal ? 'Edit Kapal' : 'Tambah Kapal Baru'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kapal *</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik</label>
                  <input
                    type="text"
                    value={formData.namaPemilik}
                    onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanda Selar</label>
                  <input
                    type="text"
                    value={formData.tandaSelar}
                    onChange={(e) => setFormData({ ...formData, tandaSelar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanda Pengenal</label>
                  <input
                    type="text"
                    value={formData.tandaPengenal}
                    onChange={(e) => setFormData({ ...formData, tandaPengenal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berat Kotor (GT)</label>
                  <input
                    type="text"
                    value={formData.beratKotor}
                    onChange={(e) => setFormData({ ...formData, beratKotor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berat Bersih (NT)</label>
                  <input
                    type="text"
                    value={formData.beratBersih}
                    onChange={(e) => setFormData({ ...formData, beratBersih: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merek Mesin</label>
                  <input
                    type="text"
                    value={formData.merekMesin}
                    onChange={(e) => setFormData({ ...formData, merekMesin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Seri Mesin</label>
                  <input
                    type="text"
                    value={formData.nomorSeriMesin}
                    onChange={(e) => setFormData({ ...formData, nomorSeriMesin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Alat Tangkap</label>
                  <input
                    type="text"
                    value={formData.jenisAlatTangkap}
                    onChange={(e) => setFormData({ ...formData, jenisAlatTangkap: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {editingKapal ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedKapal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Detail Kapal: {selectedKapal.nama}</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3 border-b pb-2">Informasi Kapal</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Nama Kapal</span>
                      <p className="font-medium">{selectedKapal.nama || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Nama Pemilik</span>
                      <p className="font-medium">{selectedKapal.namaPemilik || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Tanda Selar</span>
                      <p className="font-medium">{selectedKapal.tandaSelar || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Tanda Pengenal</span>
                      <p className="font-medium">{selectedKapal.tandaPengenal || '-'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3 border-b pb-2">Spesifikasi</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-500">Berat Kotor (GT)</span>
                      <p className="font-medium">{selectedKapal.beratKotor || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Berat Bersih (NT)</span>
                      <p className="font-medium">{selectedKapal.beratBersih || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Merek Mesin</span>
                      <p className="font-medium">{selectedKapal.merekMesin || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Nomor Seri Mesin</span>
                      <p className="font-medium">{selectedKapal.nomorSeriMesin || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-3 border-b pb-2">Alat Tangkap</h3>
                <p className="font-medium">{selectedKapal.jenisAlatTangkap || '-'}</p>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEdit(selectedKapal);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Kapal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-red-600">Konfirmasi Hapus</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Apakah Anda yakin ingin menghapus kapal ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DaftarKapal;

