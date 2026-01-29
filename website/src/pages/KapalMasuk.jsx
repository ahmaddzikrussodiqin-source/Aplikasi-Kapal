import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalMasukAPI, kapalAPI } from '../services/api';
import DatePicker from '../components/DatePicker';

const KapalMasuk = () => {
  const { token, socket } = useAuth();
  const [kapalMasukList, setKapalMasukList] = useState([]);
  const [kapalList, setKapalList] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadData();
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
    try {
      const [kapalMasukRes, kapalRes] = await Promise.all([
        kapalMasukAPI.getAll(token),
        kapalAPI.getAll(token),
      ]);

      if (kapalMasukRes.success) {
        setKapalMasukList(kapalMasukRes.data || []);
      }
      if (kapalRes.success) {
        setKapalList(kapalRes.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        kapalId: formData.kapalId ? parseInt(formData.kapalId) : null,
        tanggalInput: new Date().toISOString().split('T')[0],
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
    const selectedKapal = kapalList.find(k => k.id === kapal.kapalId) || 
                          kapalList.find(k => k.nama === kapal.nama);
    
    setEditingKapal(kapal);
    setFormData({
      kapalId: selectedKapal?.id?.toString() || kapal.kapalId?.toString() || '',
      nama: kapal.nama || '',
      tanggalKembali: kapal.tanggalKembali || '',
      status: kapal.status || '',
      listPersiapan: kapal.listPersiapan || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
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

  const handleFinish = async (kapal) => {
    setFinishKapal(kapal);
    setFinishDate(new Date().toISOString().split('T')[0]);
    setShowFinishModal(true);
  };

  const handleFinishConfirm = async () => {
    if (!finishDate || !finishKapal) return;

    try {
      const response = await kapalMasukAPI.update(token, finishKapal.id, {
        ...finishKapal,
        isFinished: true,
        perkiraanKeberangkatan: finishDate,
        tanggalBerangkat: finishDate,
      });
      if (response.success) {
        loadData();
      }
    } catch (error) {
      console.error('Error finishing kapal:', error);
    } finally {
      setShowFinishModal(false);
      setFinishKapal(null);
      setFinishDate('');
    }
  };

  const handleUnfinish = async (kapal) => {
    if (!window.confirm('Batalkan finish?')) return;

    try {
      const response = await kapalMasukAPI.update(token, kapal.id, {
        ...kapal,
        isFinished: false,
        perkiraanKeberangkatan: null,
        tanggalBerangkat: null,
      });
      if (response.success) {
        loadData();
      }
    } catch (error) {
      console.error('Error unfinishing kapal:', error);
    }
  };

  const handleTambahKebutuhan = (kapal) => {
    setSelectedKapalForKebutuhan(kapal);
    setNewKebutuhan('');
    setShowKebutuhanModal(true);
  };

  const handleTambahKebutuhanConfirm = async () => {
    if (!newKebutuhan.trim() || !selectedKapalForKebutuhan) return;

    try {
      const updatedList = [...(selectedKapalForKebutuhan.listPersiapan || []), newKebutuhan.trim()];
      const updatedChecklistStates = { ...(selectedKapalForKebutuhan.checklistStates || {}), [newKebutuhan.trim()]: false };
      const updatedChecklistDates = { ...(selectedKapalForKebutuhan.checklistDates || {}), [newKebutuhan.trim()]: '' };

      const response = await kapalMasukAPI.update(token, selectedKapalForKebutuhan.id, {
        ...selectedKapalForKebutuhan,
        listPersiapan: updatedList,
        checklistStates: updatedChecklistStates,
        checklistDates: updatedChecklistDates,
      });

      if (response.success) {
        loadData();
        setShowKebutuhanModal(false);
        setSelectedKapalForKebutuhan(null);
        setNewKebutuhan('');
      }
    } catch (error) {
      console.error('Error adding kebutuhan:', error);
    }
  };

  const toggleChecklist = async (kapal, item) => {
    const isChecked = kapal.checklistStates?.[item];

    if (!isChecked) {
      setSelectedKapal(kapal);
      setSelectedItem(item);
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setShowDateModal(true);
    } else {
      const newStates = { ...kapal.checklistStates, [item]: false };
      const newDates = { ...kapal.checklistDates };
      delete newDates[item];

      try {
        await kapalMasukAPI.update(token, kapal.id, {
          ...kapal,
          checklistStates: newStates,
          checklistDates: newDates,
        });
        loadData();

        if (socket) {
          socket.emit('update-checklist', {
            kapalId: kapal.id,
            item,
            checked: false,
            date: '',
          });
        }
      } catch (error) {
        console.error('Error updating checklist:', error);
      }
    }
  };

  const handleDateConfirm = async () => {
    if (!selectedDate || !selectedKapal || !selectedItem) return;

    const newStates = { ...selectedKapal.checklistStates, [selectedItem]: true };
    const newDates = { ...selectedKapal.checklistDates, [selectedItem]: selectedDate };

    try {
      await kapalMasukAPI.update(token, selectedKapal.id, {
        ...selectedKapal,
        checklistStates: newStates,
        checklistDates: newDates,
      });
      loadData();

      if (socket) {
        socket.emit('update-checklist', {
          kapalId: selectedKapal.id,
          item: selectedItem,
          checked: true,
          date: selectedDate,
        });
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
    } finally {
      setShowDateModal(false);
      setSelectedKapal(null);
      setSelectedItem(null);
      setSelectedDate('');
    }
  };

  const addPersiapan = () => {
    if (newPersiapan.trim()) {
      setFormData({
        ...formData,
        listPersiapan: [...formData.listPersiapan, newPersiapan.trim()],
      });
      setNewPersiapan('');
    }
  };

  const removePersiapan = (index) => {
    setFormData({
      ...formData,
      listPersiapan: formData.listPersiapan.filter((_, i) => i !== index),
    });
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

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return '-';
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} hari`;
    } catch {
      return '-';
    }
  };

  const calculateDurasiBerlabuh = (tanggalKembali, perkiraanKeberangkatan) => {
    if (!tanggalKembali) return '-';
    try {
      const kembali = new Date(tanggalKembali);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (perkiraanKeberangkatan) {
        const keberangkatan = new Date(perkiraanKeberangkatan);
        const diffTime = keberangkatan - kembali;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} hari`;
      }
      
      const diffTime = today - kembali;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} hari`;
    } catch {
      return '-';
    }
  };

  const calculateDurasiBerlayar = (kapal) => {
    // Jika kapal belum berlayar (tidak ada tanggal keberangkatan)
    if (!kapal.perkiraanKeberangkatan) return '-';
    
    try {
      const keberangkatan = new Date(kapal.perkiraanKeberangkatan);
      
      // Cek apakah kapal sudah kembali (ada tanggalKembali yang lebih baru dari keberangkatan)
      if (kapal.tanggalKembali) {
        const kembali = new Date(kapal.tanggalKembali);
        
        // Jika kapal sudah kembali (tanggalKembali > keberangkatan)
        if (kembali > keberangkatan) {
          const diffTime = kembali - keberangkatan;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return `${diffDays} hari`;
        }
      }
      
      // Jika kapal belum kembali, hitung hingga hari ini
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = today - keberangkatan;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Jika tanggal keberangkatan masih di masa depan
      if (diffDays < 0) {
        return 'Belum berlayar';
      }
      
      return `${diffDays} hari`;
    } catch (error) {
      console.error('Error calculating sailing duration:', error);
      return '-';
    }
  };

  const isAllChecklistCompleted = (kapal) => {
    if (!kapal.listPersiapan || kapal.listPersiapan.length === 0) return false;
    return kapal.listPersiapan.every(item => kapal.checklistStates?.[item] === true);
  };

  const filteredKapal = kapalMasukList.filter(kapal =>
    kapal.listPersiapan?.some(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            + Tambah Status Kerja Kapal
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari kebutuhan atau persiapan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredKapal.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Tidak ada data kapal masuk</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredKapal.map((kapal) => (
              <div key={kapal.id} className={`bg-white rounded-lg shadow p-6 ${kapal.isFinished ? 'border-l-4 border-green-500' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{kapal.nama}</h3>
                    <p className="text-gray-500 text-sm">Status: {kapal.status || '-'}</p>
                    <p className="text-gray-500 text-sm">Tanggal Kembali: {formatDate(kapal.tanggalKembali)}</p>
                    {kapal.perkiraanKeberangkatan && (
                      <p className="text-green-600 text-sm font-medium">
                        Berangkat: {formatDate(kapal.perkiraanKeberangkatan)}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2">
                      <p className={`text-sm font-medium ${calculateDurasiBerlabuh(kapal.tanggalKembali, kapal.perkiraanKeberangkatan) !== '-' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <span className="font-semibold">🏛️ Durasi Berlabuh:</span> {calculateDurasiBerlabuh(kapal.tanggalKembali, kapal.perkiraanKeberangkatan)}
                      </p>
                      {kapal.perkiraanKeberangkatan && (
                        <p className={`text-sm font-medium ${calculateDurasiBerlayar(kapal) !== '-' ? 'text-purple-600' : 'text-gray-500'}`}>
                          <span className="font-semibold">⚓ Durasi Berlayar:</span> {calculateDurasiBerlayar(kapal)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => kapal.isFinished ? handleTambahKebutuhan(kapal) : handleEdit(kapal)}
                      className={`px-3 py-1 rounded transition-colors ${
                        kapal.isFinished
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {kapal.isFinished ? 'Tambah Kebutuhan' : 'Edit'}
                    </button>
                    <button
                      onClick={() => kapal.isFinished ? handleUnfinish(kapal) : handleFinish(kapal)}
                      disabled={!kapal.isFinished && !isAllChecklistCompleted(kapal)}
                      className={`px-3 py-1 rounded transition-colors ${
                        kapal.isFinished
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : isAllChecklistCompleted(kapal)
                            ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={!kapal.isFinished && !isAllChecklistCompleted(kapal) ? 'Selesaikan semua persiapan terlebih dahulu' : ''}
                    >
                      {kapal.isFinished ? 'Batal Finish' : 'Finish'}
                    </button>
                    <button
                      onClick={() => handleDelete(kapal.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Hapus
                    </button>
                  </div>
                </div>

                {/* Completion Status */}
                <div className="mb-4">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    kapal.isFinished
                      ? 'bg-green-100 text-green-800'
                      : isAllChecklistCompleted(kapal)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {kapal.isFinished ? '✅ Selesai' : isAllChecklistCompleted(kapal) ? '📋 Siap Finish' : '⏳ Dalam Persiapan'}
                  </span>
                </div>

                {/* Checklist */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Checklist Persiapan:</h4>
                  <div className="space-y-2">
                    {kapal.listPersiapan?.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={kapal.checklistStates?.[item] || false}
                          disabled={kapal.isFinished && !kapal.checklistStates?.[item]}
                          onChange={() => toggleChecklist(kapal, item)}
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={`flex-1 ${kapal.checklistStates?.[item] ? 'line-through text-gray-400' : ''}`}>
                          {item}
                        </span>
                        <span className="text-sm text-gray-500 min-w-[100px] text-right">
                          {kapal.checklistDates?.[item]}
                        </span>
                      </div>
                    ))}
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
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingKapal ? 'Edit Status Kerja Kapal' : 'Tambah Status Kerja Kapal Baru'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kapal *</label>
                <select
                  value={formData.kapalId}
                  onChange={(e) => {
                    const selected = kapalList.find(k => k.id === parseInt(e.target.value));
                    setFormData({
                      ...formData,
                      kapalId: e.target.value,
                      nama: selected?.nama || e.target.options[e.target.selectedIndex].text,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">Pilih Kapal</option>
                  {kapalList.map(kapal => (
                    <option key={kapal.id} value={kapal.id}>{kapal.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kembali *</label>
                <DatePicker
                  selected={formData.tanggalKembali}
                  onChange={(date) => setFormData({ ...formData, tanggalKembali: date })}
                  placeholderText="Pilih tanggal kembali"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input
                  type="text"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Masukkan status"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persiapan</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPersiapan}
                    onChange={(e) => setNewPersiapan(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPersiapan())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Tambah persiapan..."
                  />
                  <button
                    type="button"
                    onClick={addPersiapan}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Tambah
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {formData.listPersiapan.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded">
                      <span className="flex-1">{index + 1}. {item}</span>
                      <button
                        type="button"
                        onClick={() => removePersiapan(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
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

      {/* Date Picker Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Pilih Tanggal Penyelesaian</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Penyelesaian
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowDateModal(false);
                    setSelectedKapal(null);
                    setSelectedItem(null);
                    setSelectedDate('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDateConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!selectedDate}
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finish Confirmation Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Konfirmasi Finish Kapal</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Anda akan menandai kapal <strong>{finishKapal?.nama}</strong> sebagai sudah selesai/berangkat.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Keberangkatan
                </label>
                <DatePicker
                  selected={finishDate}
                  onChange={(date) => setFinishDate(date)}
                  placeholderText="Pilih tanggal keberangkatan"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowFinishModal(false);
                    setFinishKapal(null);
                    setFinishDate('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleFinishConfirm}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  disabled={!finishDate}
                >
                  Finish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tambah Kebutuhan Modal */}
      {showKebutuhanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Tambah Kebutuhan</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Menambahkan kebutuhan baru untuk kapal <strong>{selectedKapalForKebutuhan?.nama}</strong>
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kebutuhan Baru
                </label>
                <input
                  type="text"
                  value={newKebutuhan}
                  onChange={(e) => setNewKebutuhan(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTambahKebutuhanConfirm()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Masukkan kebutuhan baru..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowKebutuhanModal(false);
                    setSelectedKapalForKebutuhan(null);
                    setNewKebutuhan('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleTambahKebutuhanConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!newKebutuhan.trim()}
                >
                  Tambah
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
                Apakah Anda yakin ingin menghapus kapal masuk ini? Tindakan ini tidak dapat dibatalkan.
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

export default KapalMasuk;

