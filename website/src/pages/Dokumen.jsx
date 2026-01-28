import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalAPI, dokumenAPI } from '../services/api';

const Dokumen = () => {
  const { token } = useAuth();
  const [kapalList, setKapalList] = useState([]);
  const [selectedKapal, setSelectedKapal] = useState(null);
  const [dokumenList, setDokumenList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedDokumen, setSelectedDokumen] = useState(null);
  const [formData, setFormData] = useState({
    kapalId: '',
    nama: '',
    jenis: '',
    tanggalKadaluarsa: '',
    filePath: '',
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadKapalList();
  }, [token]);

  useEffect(() => {
    if (selectedKapal) {
      loadDokumenForKapal(selectedKapal.id);
    }
  }, [selectedKapal, token]);

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

  const loadDokumenForKapal = async (kapalId) => {
    try {
      const data = await dokumenAPI.getByKapalId(token, kapalId);
      if (data.success) {
        setDokumenList(data.data || []);
      }
    } catch (error) {
      console.error('Error loading dokumen:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        kapalId: parseInt(formData.kapalId),
        status: 'aktif',
      };

      const response = await dokumenAPI.create(token, payload);
      if (response.success) {
        setShowModal(false);
        setFormData({
          kapalId: '',
          nama: '',
          jenis: '',
          tanggalKadaluarsa: '',
          filePath: '',
        });
        if (selectedKapal) {
          loadDokumenForKapal(selectedKapal.id);
        }
      }
    } catch (error) {
      console.error('Error creating dokumen:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      try {
        const response = await dokumenAPI.delete(token, id);
        if (response.success) {
          if (selectedKapal) {
            loadDokumenForKapal(selectedKapal.id);
          }
        }
      } catch (error) {
        console.error('Error deleting dokumen:', error);
      }
    }
  };

  const handleUpdateExpiry = async (id, newDate) => {
    try {
      const dokumen = dokumenList.find(d => d.id === id);
      if (!dokumen) return;

      const response = await dokumenAPI.update(token, id, {
        ...dokumen,
        tanggalKadaluarsa: newDate,
      });
      if (response.success) {
        if (selectedKapal) {
          loadDokumenForKapal(selectedKapal.id);
        }
      }
    } catch (error) {
      console.error('Error updating expiry:', error);
    }
  };

  const parseFilePath = (filePath) => {
    if (!filePath) return { images: [], pdfs: [] };
    try {
      const parsed = JSON.parse(filePath);
      return {
        images: parsed.images || [],
        pdfs: parsed.pdfs || [],
      };
    } catch {
      return { images: [], pdfs: [] };
    }
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    try {
      const [year, month, day] = dateStr.split('-');
      const expiryDate = new Date(year, month - 1, day);
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 60;
    } catch {
      return false;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:bg-blue-700 p-2 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">
              {selectedKapal ? `Dokumen: ${selectedKapal.nama}` : 'Dokumen Kapal'}
            </h1>
          </div>
          {selectedKapal && (
            <button
              onClick={() => {
                setFormData({ ...formData, kapalId: selectedKapal.id.toString() });
                setShowModal(true);
              }}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              + Tambah Dokumen
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Ship Selection */}
        {!selectedKapal && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Pilih Kapal:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kapalList.map((kapal) => (
                <button
                  key={kapal.id}
                  onClick={() => setSelectedKapal(kapal)}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow text-left"
                >
                  <h3 className="font-semibold text-gray-800">{kapal.nama}</h3>
                  <p className="text-gray-500 text-sm">Pemilik: {kapal.namaPemilik || '-'}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Ship Documents */}
        {selectedKapal && (
          <>
            <div className="mb-6">
              <button
                onClick={() => {
                  setSelectedKapal(null);
                  setDokumenList([]);
                }}
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                ← Kembali ke daftar kapal
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : dokumenList.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Tidak ada dokumen</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {dokumenList.map((dokumen) => {
                  const { images, pdfs } = parseFilePath(dokumen.filepath);
                  const expired = isExpiringSoon(dokumen.tanggalkadaluarsa);

                  return (
                    <div key={dokumen.id} className={`bg-white rounded-lg shadow p-6 ${expired ? 'border-l-4 border-red-500' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-800">{dokumen.jenis || dokumen.nama}</h3>
                            {expired && (
                              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                                Segera Expired
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm">Tanggal Kadaluarsa: {formatDate(dokumen.tanggalkadaluarsa)}</p>

                          {/* Images */}
                          {images.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700">Gambar:</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {images.map((img, idx) => (
                                  <a
                                    key={idx}
                                    href={img}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <img
                                      src={img}
                                      alt={`Gambar ${idx + 1}`}
                                      className="w-20 h-20 object-cover rounded border hover:opacity-75"
                                      onError={(e) => e.target.style.display = 'none'}
                                    />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PDFs */}
                          {pdfs.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700">PDF:</p>
                              <div className="flex gap-2 mt-1">
                                {pdfs.map((pdf, idx) => (
                                  <a
                                    key={idx}
                                    href={pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                                  >
                                    PDF {idx + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const newDate = prompt('Masukkan tanggal kadaluarsa baru (YYYY-MM-DD):', dokumen.tanggalkadaluarsa);
                              if (newDate) {
                                handleUpdateExpiry(dokumen.id, newDate);
                              }
                            }}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors text-sm"
                          >
                            Ubah Tgl
                          </button>
                          <button
                            onClick={() => handleDelete(dokumen.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Document Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Tambah Dokumen Baru</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Dokumen *</label>
                <input
                  type="text"
                  value={formData.jenis}
                  onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kadaluarsa</label>
                <input
                  type="date"
                  value={formData.tanggalKadaluarsa}
                  onChange={(e) => setFormData({ ...formData, tanggalKadaluarsa: e.target.value })}
                  className="input-field"
                />
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
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dokumen;
