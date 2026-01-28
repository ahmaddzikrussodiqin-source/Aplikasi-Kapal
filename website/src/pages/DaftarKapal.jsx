import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalAPI } from '../services/api';

const DaftarKapal = () => {
  const { token } = useAuth();
  const [kapalList, setKapalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kapal ini?')) {
      try {
        const response = await kapalAPI.delete(token, id);
        if (response.success) {
          loadKapalList();
        }
      } catch (error) {
        console.error('Error deleting kapal:', error);
      }
    }
  };

  const filteredKapal = kapalList.filter(kapal =>
    kapal.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kapal.namaPemilik?.toLowerCase().includes(searchTerm.toLowerCase())
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
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            + Tambah Kapal
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari kapal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Kapal List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredKapal.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Tidak ada data kapal</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredKapal.map((kapal) => (
              <div key={kapal.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{kapal.nama}</h3>
                    <p className="text-gray-500 text-sm mt-1">Pemilik: {kapal.namaPemilik || '-'}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-gray-500">Tanda Selar:</span>
                        <p className="font-medium">{kapal.tandaSelar || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Tanda Pengenal:</span>
                        <p className="font-medium">{kapal.tandaPengenal || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Berat Kotor:</span>
                        <p className="font-medium">{kapal.beratKotor || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Berat Bersih:</span>
                        <p className="font-medium">{kapal.beratBersih || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Merek Mesin:</span>
                        <p className="font-medium">{kapal.merekMesin || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">No. Seri Mesin:</span>
                        <p className="font-medium">{kapal.nomorSeriMesin || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Alat Tangkap:</span>
                        <p className="font-medium">{kapal.jenisAlatTangkap || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(kapal)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(kapal.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingKapal ? 'Edit Kapal' : 'Tambah Kapal Baru'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kapal *</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik</label>
                  <input
                    type="text"
                    value={formData.namaPemilik}
                    onChange={(e) => setFormData({ ...formData, namaPemilik: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanda Selar</label>
                  <input
                    type="text"
                    value={formData.tandaSelar}
                    onChange={(e) => setFormData({ ...formData, tandaSelar: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanda Pengenal</label>
                  <input
                    type="text"
                    value={formData.tandaPengenal}
                    onChange={(e) => setFormData({ ...formData, tandaPengenal: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berat Kotor (GT)</label>
                  <input
                    type="text"
                    value={formData.beratKotor}
                    onChange={(e) => setFormData({ ...formData, beratKotor: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berat Bersih (NT)</label>
                  <input
                    type="text"
                    value={formData.beratBersih}
                    onChange={(e) => setFormData({ ...formData, beratBersih: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Merek Mesin</label>
                  <input
                    type="text"
                    value={formData.merekMesin}
                    onChange={(e) => setFormData({ ...formData, merekMesin: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Seri Mesin</label>
                  <input
                    type="text"
                    value={formData.nomorSeriMesin}
                    onChange={(e) => setFormData({ ...formData, nomorSeriMesin: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Alat Tangkap</label>
                  <input
                    type="text"
                    value={formData.jenisAlatTangkap}
                    onChange={(e) => setFormData({ ...formData, jenisAlatTangkap: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  {editingKapal ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DaftarKapal;

