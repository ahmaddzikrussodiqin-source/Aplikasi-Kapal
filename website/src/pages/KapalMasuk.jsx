import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalMasukAPI, kapalAPI } from '../services/api';
import DatePicker from '../components/DatePicker';

const KapalMasuk = () => {
  const { token, socket } = useAuth();
  const [kapalMasukList, setKapalMasukList] = useState([]);
  const [kapalList, setKapalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedKapal, setSelectedKapal] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [finishKapal, setFinishKapal] = useState(null);
  const [finishDate, setFinishDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [newKebutuhan, setNewKebutuhan] = useState('');
  const [showKebutuhanModal, setShowKebutuhanModal] = useState(false);
  const [selectedKapalForKebutuhan, setSelectedKapalForKebutuhan] = useState(null);
  const [formData, setFormData] = useState({
    kapalId: '',
    nama: '',
    tanggalKembali: '',
    status: '',
    listPersiapan: [],
  });
  const [newPersiapan, setNewPersiapan] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showEditKebutuhanModal, setShowEditKebutuhanModal] = useState(false);
  const [editingKebutuhan, setEditingKebutuhan] = useState(null);
  const [editKebutuhanName, setEditKebutuhanName] = useState('');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  useEffect(() => {
    if (socket) {
      socket.on('checklist-updated', (data) => {
        setKapalMasukList(prev => prev.map(kapal => {
          if (kapal.id === data.kapalId) {
            return {
              ...kapal,
              checklistStates: data.checklistStates,
              checklistDates: data.checklistDates,
            };
          }
          return kapal;
        }));
      });
    }
    return () => {
      if (socket) {
        socket.off('checklist-updated');
      }
    };
  }, [socket]);

  const loadData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log('Loading data...');
      const [kapalMasukRes, kapalRes] = await Promise.all([
        kapalMasukAPI.getAll(token),
        kapalAPI.getAll(token),
      ]);

      console.log('API Response kapalMasukRes.data[0].checklistStates:', kapalMasukRes.data?.[0]?.checklistStates);

      if (kapalMasukRes.success) {
        const processedKapalMasuk = (kapalMasukRes.data || []).map(kapal => ({
          ...kapal,
          checklistStates: kapal.checklistStates || {},
          checklistDates: kapal.checklistDates || {},
          finishedChecklistStates: kapal.finishedChecklistStates || {},
        }));
        setKapalMasukList(processedKapalMasuk);
        console.log('Loaded kapalMasuk[0].checklistStates:', processedKapalMasuk[0]?.checklistStates);
      }
      if (kapalRes.success) {
        setKapalList(kapalRes.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Gagal memuat data kapal masuk. Periksa koneksi atau login ulang. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTambahKebutuhan = useCallback((kapalId) => {
    const currentKapal = kapalMasukList.find(k => k.id === kapalId);
    if (currentKapal) {
      console.log('handleTambahKebutuhan currentKapal states:', currentKapal.checklistStates);
      setSelectedKapalForKebutuhan({ ...currentKapal });
      setNewKebutuhan('');
      setShowKebutuhanModal(true);
    }
  }, [kapalMasukList]);

  const handleTambahKebutuhanConfirm = useCallback(async () => {
    if (!newKebutuhan.trim() || !selectedKapalForKebutuhan) return;

    try {
      const freshKapal = kapalMasukList.find(k => k.id === selectedKapalForKebutuhan.id);
      
      const currentStates = freshKapal?.checklistStates || selectedKapalForKebutuhan.checklistStates || {};
      const updatedChecklistStates = { ...currentStates };
      updatedChecklistStates[newKebutuhan.trim()] = false;

      const currentDates = freshKapal?.checklistDates || selectedKapalForKebutuhan.checklistDates || {};
      const updatedChecklistDates = { ...currentDates };
      updatedChecklistDates[newKebutuhan.trim()] = '';

      const updatedList = [...(freshKapal?.listPersiapan || selectedKapalForKebutuhan.listPersiapan || []), newKebutuhan.trim()];

      const updatePayload = {
        ...freshKapal || selectedKapalForKebutuhan,
        listPersiapan: updatedList,
        checklistStates: updatedChecklistStates,
        checklistDates: updatedChecklistDates
      };

      const response = await kapalMasukAPI.update(token, selectedKapalForKebutuhan.id, updatePayload);

      if (response.success) {
        loadData();
        setShowKebutuhanModal(false);
        setSelectedKapalForKebutuhan(null);
        setNewKebutuhan('');
      } else {
        console.error('API failed:', response);
        loadData();
      }
    } catch (error) {
      console.error('Error adding kebutuhan:', error);
      loadData();
    }
  }, [kapalMasukList, token, newKebutuhan, selectedKapalForKebutuhan, loadData]);

  const filteredKapalMasuk = kapalMasukList.filter(kapal =>
    kapal.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kapal.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        kapalId: parseInt(formData.kapalId),
      };
      let response;
      if (editingKapal) {
        response = await kapalMasukAPI.update(token, editingKapal.id, payload);
      } else {
        response = await kapalMasukAPI.create(token, payload);
      }
      if (response.success) {
        setShowModal(false);
        setEditingKapal(null);
        setFormData({
          kapalId: '',
          nama: '',
          tanggalKembali: '',
          status: '',
          listPersiapan: [],
        });
        loadData();
      }
    } catch (error) {
      console.error('Error saving kapal masuk:', error);
    }
  };

  const handleEdit = (kapal) => {
    setEditingKapal(kapal);
    setFormData({
      kapalId: kapal.kapalId?.toString() || '',
      nama: kapal.nama || '',
      tanggalKembali: kapal.tanggalKembali || '',
      status: kapal.status || '',
      listPersiapan: kapal.listPersiapan || [],
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const response = await kapalMasukAPI.delete(token, deleteConfirmId);
      if (response.success) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting kapal masuk:', error);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:bg-green-700 p-2 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">Status Kerja Kapal</h1>
          </div>
          <button
            onClick={() => {
              setEditingKapal(null);
              setFormData({
                kapalId: '',
                nama: '',
                tanggalKembali: '',
                status: '',
                listPersiapan: [],
              });
              setShowModal(true);
            }}
            className="bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Kapal Masuk
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4 max-w-7xl">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => {setError(null); loadData();}} className="ml-4 text-red-700 hover:text-red-900 font-medium">
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari berdasarkan nama kapal atau status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : filteredKapalMasuk.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum ada kapal masuk</h3>
            <p className="text-gray-500 mb-6">Tambahkan kapal masuk pertama untuk memulai tracking status kerja.</p>
            <button
              onClick={() => {
                setEditingKapal(null);
                setFormData({
                  kapalId: '',
                  nama: '',
                  tanggalKembali: '',
                  status: '',
                  listPersiapan: [],
                });
                setShowModal(true);
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Kapal Masuk Pertama
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {filteredKapalMasuk.map((kapal) => (
              <div key={kapal.id} className="bg-white rounded-lg shadow hover:shadow-xl transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-full">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{kapal.nama}</h3>
                          <p className="text-green-600 font-medium">{kapal.status || 'Status: Belum ditentukan'}</p>
                        </div>
                      </div>
                      <p className="text-gray-500 mt-2">Kembali: {kapal.tanggalKembali || 'Belum ditentukan'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTambahKebutuhan(kapal.id)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm">
                        + Kebutuhan
                      </button>
                      <button onClick={() => handleEdit(kapal)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(kapal.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Checklist Preview */}
                  {kapal.listPersiapan && kapal.listPersiapan.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-3">Checklist Persiapan ({kapal.listPersiapan.length} items)</h4>
                      <div className="space-y-1">
                        {kapal.listPersiapan.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className={`w-2 h-2 rounded-full ${kapal.checklistStates?.[item] ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <span>{item}</span>
                          </div>
                        ))}
                        {kapal.listPersiapan.length > 5 && (
                          <p className="text-xs text-gray-500">+{kapal.listPersiapan.length - 5} lainnya</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tambah Kapal Masuk Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">{editingKapal ? 'Edit Kapal Masuk' : 'Tambah Kapal Masuk'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Kapal</label>
                  <select
                    value={formData.kapalId}
                    onChange={(e) => setFormData({...formData, kapalId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Pilih kapal dari daftar</option>
                    {kapalList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama} ({k.tandaSelar})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Khusus (opsional)</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Kembali</label>
                  <DatePicker
                    selected={formData.tanggalKembali || null}
                    onChange={(date) => setFormData({...formData, tanggalKembali: date})}
                    placeholderText="Pilih tanggal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Contoh: Perbaikan Mesin"
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Batal
                  </button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    {editingKapal ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Kebutuhan Modal */}
        {showKebutuhanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Tambah Kebutuhan Baru</h2>
                <input
                  type="text"
                  value={newKebutuhan}
                  onChange={(e) => setNewKebutuhan(e.target.value)}
                  placeholder="Masukkan kebutuhan baru (contoh: Ganti oli)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={handleTambahKebutuhanConfirm} className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600">
                    Tambah
                  </button>
                  <button onClick={() => setShowKebutuhanModal(false)} className="flex-1 bg-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400">
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-red-600 mb-2">Konfirmasi Hapus</h2>
                <p className="text-gray-700 mb-6">Yakin hapus kapal masuk ini? Tindakan tidak bisa dibatalkan.</p>
                <div className="flex gap-3">
                  <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700">
                    Hapus
                  </button>
                  <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400">
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KapalMasuk;

