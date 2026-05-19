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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [selectedKapalMasuk, setSelectedKapalMasuk] = useState(null);
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
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
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
    safeTanggalKembali: safeDateParse(kapal.tanggalKembali),
    safeTanggalBerangkat: safeDateParse(kapal.tanggalBerangkat),
    safeTanggalKeberangkatan: safeDateParse(kapal.tanggalKeberangkatan)
  });


  const isSailing = (s) => {
    const t = (s || '').toLowerCase().trim();
    return t.includes('berlayar') || t === 'sailing';
  };

  const getStatusBadge = (status) => {

    const s = (status || '').toLowerCase().trim();
    if (isSailing(s)) {
      return { icon: '🛥️', text: 'Berlayar', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (s.includes('menepi') || s === 'docked') {
      return { icon: '⚓', text: 'Menepi', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    return { icon: '⏳', text: status || 'Persiapan', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  };

  const getBerapaLamaBerlayar = (kapal) => {
    const start = kapal.safeTanggalBerangkat || kapal.safeTanggalKeberangkatan;
    if (!start) return null;
    const diffMs = Date.now() - start.getTime();
    if (diffMs < 0) return null;

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days} hari ${remHours} jam`;
    }

    return `${hours} jam ${minutes} menit`;
  };

  const getChecklistProgress = (kapal) => {
    const items = kapal.listPersiapan || [];
    const states = kapal.checklistStates || {};
    const checked = items.filter(item => states[item]).length;
    const total = items.length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { checked, total, percent };
  };

  const getKebutuhanSection = (kapal, isCompact = true, onToggle) => {
    const listPersiapan = kapal.listPersiapan || [];
    const isEmpty = listPersiapan.length === 0;
    const progress = getChecklistProgress(kapal);
const itemsToShow = listPersiapan;

    if (isEmpty) {
      const defaults = [
        `Persiapan umum untuk "${kapal.nama || 'kapal'}"`,
        ...(kapal.namaPemilik ? [`Cek dokumen pemilik: ${kapal.namaPemilik}`] : []),
        ...(kapal.tandaSelar ? [`Verifikasi tanda selar: ${kapal.tandaSelar}`] : []),
        ...(kapal.tandaPengenal ? [`Cek tanda pengenal: ${kapal.tandaPengenal}`] : []),
        ...(kapal.jenisAlatTangkap ? [`Persiapan alat tangkap: ${kapal.jenisAlatTangkap}`] : []),
        'Persiapan mesin dan bahan bakar',
        'Cek navigasi dan alat komunikasi',
        'Pemeriksaan keselamatan kru'
      ].slice(0, 8);

      return (
        <div className="bg-blue-50 p-6 rounded-xl border-2 border-dashed border-blue-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            Kebutuhan / Persiapan Default
            <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              8 items (otomatis)
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            {defaults.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border-l-4 border-blue-400">
                <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item}</p>
                  <p className="text-xs text-gray-500">Default - belum ditandai</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-3 italic bg-blue-100 p-2 rounded">
            Kebutuhan default otomatis berdasarkan data kapal. Tambah manual untuk custom.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          Kebutuhan / Persiapan
          <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
            {progress.checked}/{progress.total} ({progress.percent}%)
          </span>
        </h3>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {itemsToShow.map((item) => (
            <label key={item} className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-yellow-400 hover:bg-yellow-100 cursor-pointer">
              <input
                type="checkbox"
                checked={kapal.checklistStates?.[item] || false}
                onChange={() => onToggle && onToggle(item)}
                className="mt-1 w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item}</p>
                {kapal.checklistDates?.[item] && (
                  <p className="text-xs text-gray-500">Selesai: {kapal.checklistDates[item]}</p>
                )}
              </div>
            </label>
          ))}
        </div>
        {listPersiapan.length > itemsToShow.length && (
          <p className="text-sm text-gray-500 mt-2">+{listPersiapan.length - itemsToShow.length} more...</p>
        )}
      </div>
    );
  };

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
          .filter(k => k && !k.error)
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
    (kapal.status || kapal.statusKerja || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    kapal.namaPemilik?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleViewDetail = (kapal) => {
    setSelectedKapalMasuk(kapal);
    setShowDetailModal(true);
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const handleChecklistToggle = useCallback(async (item, kapalId) => {
    try {
      const kapal = kapalMasukList.find(k => k.id === kapalId);
      if (!kapal) return;

      // Optimistic update
      const newStates = { ...kapal.checklistStates, [item]: !kapal.checklistStates?.[item] };
      const isChecked = newStates[item];
      const newDates = { ...kapal.checklistDates };
      if (isChecked) {
        newDates[item] = new Date().toLocaleDateString('id-ID');
      } else {
        newDates[item] = '';
      }

      setKapalMasukList(prev => prev.map(k => k.id === kapalId ? { ...k, checklistStates: newStates, checklistDates: newDates } : k));

      const payload = { ...kapal, checklistStates: newStates, checklistDates: newDates };
      const response = await kapalMasukAPI.update(token, kapalId, payload);

      if (!response.success) {
        // Revert on failure
        loadData();
        throw new Error(response.message || 'Update failed');
      }
    } catch (error) {
      console.error('Checklist toggle error:', error);
      loadData(); // Reload to revert
      alert('Gagal update checklist: ' + error.message);
    }
  }, [token, kapalMasukList, loadData]);

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
              placeholder="Cari nama kapal, pemilik, atau status..."
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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-green-100 p-2 rounded-full">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                        <h3 className="text-xl font-semibold text-gray-800">{kapal.nama}</h3>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(kapal.status || kapal.statusKerja).color}`}>
                          {getStatusBadge(kapal.status || kapal.statusKerja).icon}
                          <span className="ml-1">{getStatusBadge(kapal.status || kapal.statusKerja).text}</span>
                        </div>
                        <p className="text-gray-500">Kembali: {kapal.tanggalKembali || 'Belum ditentukan'}</p>
                        <p className="text-gray-500 text-sm">Pemilik: {kapal.namaPemilik || '-'}</p>
                      </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleViewDetail(kapal)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 text-sm" title="Lihat Detail">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detail
                      </button>
                      <button onClick={() => handleTambahKebutuhan(kapal.id)} className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 text-sm">
                        + Kebutuhan
                      </button>
                      <button onClick={() => handleEdit(kapal)} className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 text-sm">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(kapal.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm">
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Detail Grid - Compact view */}
                    {getKebutuhanSection(kapal, true, (item) => handleChecklistToggle(item, kapal.id))}
              </div>
            ))}
          </div>
        )}

        {/* Tambah/Edit Modal */}
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

        {/* Detail Modal */}
{showDetailModal && selectedKapalMasuk && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh]">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-semibold text-gray-800">Detail Kapal Masuk: {selectedKapalMasuk.nama}</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700 p-1 -m-1 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Informasi Kapal */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-3">Informasi Kapal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Pemilik Kapal</span>
                      <p className="text-xl font-semibold text-gray-900">{selectedKapalMasuk.namaPemilik || '-' }</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Tanda Selar</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.tandaSelar || '-' }</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Tanda Pengenal</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.tandaPengenal || '-' }</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Berat Kotor</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.beratKotor || '-' } GT</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Berat Bersih</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.beratBersih || '-' } NT</p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <span className="text-sm font-medium text-gray-500 block mb-1">Merek Mesin</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.merekMesin || '-' }</p>
                    </div>
                    <div className="lg:col-span-3">
                      <span className="text-sm font-medium text-gray-500 block mb-1">Jenis Alat Tangkap</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.jenisAlatTangkap || '-' }</p>
                    </div>
                  </div>
                </div>

                {/* Status Kerja */}
                <div className="bg-emerald-50 p-6 rounded-xl border-l-4 border-emerald-400">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Kerja</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-500 block">Status</span>
                      <p className="text-2xl font-bold text-emerald-700">{selectedKapalMasuk.status || selectedKapalMasuk.statusKerja || 'Persiapan'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Kembali</span>
                      <p className="text-xl font-semibold">{selectedKapalMasuk.tanggalKembali || 'Belum ditentukan'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Durasi Berlayar</span>
                      <p className="text-xl font-semibold">
                        {isSailing(selectedKapalMasuk.status || selectedKapalMasuk.statusKerja)
                          ? (getBerapaLamaBerlayar(selectedKapalMasuk) || '- tidak ada data')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block">Persiapan</span>
                      <p className="text-lg font-semibold">{selectedKapalMasuk.listPersiapan?.length || 0} items</p>
                    </div>
                  </div>
                </div>

                {/* Kebutuhan / Persiapan Preview */}
                {getKebutuhanSection(selectedKapalMasuk, false, (item) => handleChecklistToggle(item, selectedKapalMasuk.id))}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedKapalMasuk);
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Kapal Masuk
                  </button>
                  <button
                    onClick={() => handleTambahKebutuhan(selectedKapalMasuk.id)}
                    className="flex-1 bg-yellow-500 text-white py-3 px-6 rounded-lg hover:bg-yellow-600 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    + Tambah Kebutuhan
                  </button>
                </div>
              </div>
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
