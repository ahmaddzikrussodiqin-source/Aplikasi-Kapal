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
  const [editingKapal, setEditingKapal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
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

  const safeDateParse = (dateStr) => {
    if (!dateStr || dateStr === '' || dateStr === null) return null;
    try {
      // Handle common Indonesian formats safely
      if (/^\\d{2}\/\\d{2}\/\\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  const safeProcessKapal = (kapal) => ({
    ...kapal,
    checklistStates: kapal.checklistStates || {},
    checklistDates: kapal.checklistDates || {},
    finishedChecklistStates: kapal.finishedChecklistStates || {},
    // Safe date parsing for UI display
    safeTanggalKembali: safeDateParse(kapal.tanggalKembali),
    safeTanggalBerangkat: safeDateParse(kapal.tanggalBerangkat),
    safeTanggalKeberangkatan: safeDateParse(kapal.tanggalKeberangkatan)
  });

  const loadData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading kapal masuk data...');
      const [kapalMasukRes, kapalRes] = await Promise.all([
        kapalMasukAPI.getAll(token),
        kapalAPI.getAll(token),
      ]);

      console.log('📥 KapalMasuk response:', kapalMasukRes);
      console.log('📥 Kapal response:', kapalRes);

      if (kapalMasukRes.success && Array.isArray(kapalMasukRes.data)) {
        const processedKapalMasuk = kapalMasukRes.data
          .filter(k => k && !k.error)  // Filter out backend parse errors
          .map(safeProcessKapal);
        setKapalMasukList(processedKapalMasuk);
        console.log(`✅ Processed ${processedKapalMasuk.length} kapal masuk records`);
      } else {
        console.warn('KapalMasuk API failed:', kapalMasukRes);
        setKapalMasukList([]);
      }

      if (kapalRes.success && Array.isArray(kapalRes.data)) {
        setKapalList(kapalRes.data);
      } else {
        console.warn('Kapal API failed:', kapalRes);
        setKapalList([]);
      }
    } catch (error) {
      console.error('💥 loadData error:', error);
      setError(`Gagal memuat data: ${error.message || 'Unknown error'}`);
      setKapalMasukList([]);
      setKapalList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTambahKebutuhan = useCallback((kapalId) => {
    const currentKapal = kapalMasukList.find(k => k.id === kapalId);
    if (currentKapal) {
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
      }
    } catch (error) {
      console.error('Error adding kebutuhan:', error);
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
              placeholder="Cari nama kapal atau status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Loading / Empty */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : filteredKapalMasuk.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Belum ada kapal masuk</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredKapalMasuk.map((kapal) => (
              <div key={kapal.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-green-100 p-2 rounded-full">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{kapal.nama}</h3>
                          <p className="text-green-600 font-medium">{kapal.status || 'Belum ditentukan'}</p>
                          <p className="text-gray-500">Kembali: {kapal.tanggalKembali || 'Belum ditentukan'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTambahKebutuhan(kapal.id)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 text-sm">
                        + Kebutuhan
                      </button>
                      <button onClick={() => handleEdit(kapal)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(kapal.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tambah/Edit Modal (minimal) */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">{editingKapal ? 'Edit' : 'Tambah'} Kapal Masuk</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <select
                  value={formData.kapalId}
                  onChange={(e) => setFormData({...formData, kapalId: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Pilih Kapal</option>
                  {kapalList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nama khusus"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="w-full p-2 border rounded"
                />
                <input
                  type="date"
                  value={formData.tanggalKembali}
                  onChange={(e) => setFormData({...formData, tanggalKembali: e.target.value})}
                  className="w-full p-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full p-2 border rounded"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 p-2 border rounded">Batal</button>
                  <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Kebutuhan Modal */}
        {showKebutuhanModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-xl font-bold mb-4">Tambah Kebutuhan</h2>
              <input
                type="text"
                value={newKebutuhan}
                onChange={(e) => setNewKebutuhan(e.target.value)}
                placeholder="Kebutuhan baru..."
                className="w-full p-2 border rounded mb-4"
              />
              <div className="flex gap-2">
                <button onClick={handleTambahKebutuhanConfirm} className="flex-1 bg-yellow-500 text-white p-2 rounded">Tambah</button>
                <button onClick={() => setShowKebutuhanModal(false)} className="flex-1 p-2 border rounded">Batal</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-xl font-bold text-red-600 mb-2">Hapus?</h2>
              <p className="mb-4">Yakin hapus kapal masuk ini?</p>
              <div className="flex gap-2">
                <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white p-2 rounded">Hapus</button>
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 p-2 border rounded">Batal</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KapalMasuk;
