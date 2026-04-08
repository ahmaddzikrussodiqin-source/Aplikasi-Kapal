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
      console.log('Loading data...');
      const [kapalMasukRes, kapalRes] = await Promise.all([
        kapalMasukAPI.getAll(token),
        kapalAPI.getAll(token),
      ]);

      console.log('API Response kapalMasukRes.data[0].checklistStates:', kapalMasukRes.data?.[0]?.checklistStates);

      if (kapalMasukRes.success) {
        // Ensure checklist states are properly initialized - NO REPLACEMENT
        const processedKapalMasuk = (kapalMasukRes.data || []).map(kapal => ({
          ...kapal,
          checklistStates: kapal.checklistStates,
          checklistDates: kapal.checklistDates,
          finishedChecklistStates: kapal.finishedChecklistStates,
        }));
        setKapalMasukList(processedKapalMasuk);
        console.log('Loaded kapalMasuk[0].checklistStates:', processedKapalMasuk[0]?.checklistStates);
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
      // Save the current checklist states with timestamps before marking as finished
      const currentChecklistStates = finishKapal.checklistStates || {};
      const currentChecklistDates = finishKapal.checklistDates || {};
      
      // Track which items were already checked at the time of finish
      const finishedChecklistStates = {};
      Object.keys(currentChecklistStates).forEach(key => {
        if (currentChecklistStates[key]) {
          finishedChecklistStates[key] = true;
        }
      });

      const response = await kapalMasukAPI.update(token, finishKapal.id, {
        ...finishKapal,
        isFinished: true,
        perkiraanKeberangkatan: finishDate,
        tanggalBerangkat: finishDate,
        finishedChecklistStates: finishedChecklistStates,
        finishedAt: new Date().toISOString(),
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
      // Restore checklist states from finishedChecklistStates before clearing it
      const restoredChecklistStates = kapal.finishedChecklistStates || kapal.checklistStates;
      
      const response = await kapalMasukAPI.update(token, kapal.id, {
        ...kapal,
        isFinished: false,
        perkiraanKeberangkatan: null,
        tanggalBerangkat: null,
        checklistStates: restoredChecklistStates,
        finishedChecklistStates: null,
        finishedAt: null,
      });
      if (response.success) {
        loadData();
      }
    } catch (error) {
      console.error('Error unfinishing kapal:', error);
    }
  };

  const handleTambahKebutuhan = (kapalId) => {
    // Get FRESH data from kapalMasukList at call time
    const currentKapal = kapalMasukList.find(k => k.id === kapalId);
    if (currentKapal) {
      console.log('handleTambahKebutuhan currentKapal states:', currentKapal.checklistStates);
      setSelectedKapalForKebutuhan(currentKapal);
      setNewKebutuhan('');
      setShowKebutuhanModal(true);
    }
  };

  const handleTambahKebutuhanConfirm = useCallback(async () => {
    if (!newKebutuhan.trim() || !selectedKapalForKebutuhan) return;

    try {
      // CRITICAL: Get FRESH data from kapalMasukList - avoid stale state
      const freshKapal = kapalMasukList.find(k => k.id === selectedKapalForKebutuhan.id);
      
      console.log('=== ADD KEBUTUHAN DEBUG ===');
      console.log('Selected ID:', selectedKapalForKebutuhan.id);
      console.log('Fresh from list states:', freshKapal?.checklistStates);
      console.log('Selected stored states:', selectedKapalForKebutuhan.checklistStates);
      console.log('Using fresh states:', JSON.stringify(freshKapal?.checklistStates || selectedKapalForKebutuhan.checklistStates));
      console.log('New kebutuhan:', newKebutuhan.trim());

      const currentStates = freshKapal?.checklistStates || selectedKapalForKebutuhan.checklistStates || {};
      const updatedChecklistStates = { ...currentStates };
      updatedChecklistStates[newKebutuhan.trim()] = false;

      const currentDates = freshKapal?.checklistDates || selectedKapalForKebutuhan.checklistDates || {};
      const updatedChecklistDates = { ...currentDates };
      updatedChecklistDates[newKebutuhan.trim()] = '';

      const updatedList = [...(freshKapal?.listPersiapan || selectedKapalForKebutuhan.listPersiapan || []), newKebutuhan.trim()];

      const updatePayload = {
        ...freshKapal,
        ...selectedKapalForKebutuhan,
        listPersiapan: updatedList,
        checklistStates: updatedChecklistStates,
        checklistDates: updatedChecklistDates
      };

      console.log('Final payload checklistStates:', updatePayload.checklistStates);

      const response = await kapalMasukAPI.update(token, selectedKapalForKebutuhan.id, updatePayload);

      console.log('After update - response:', response);

      if (response.success) {
        console.log('Add successful - reloading data');
        loadData();
        setShowKebutuhanModal(false);
        setSelectedKapalForKebutuhan(null);
        setNewKebutuhan('');
        console.log('=== END ADD DEBUG ===');
      }
    } catch (error) {
      console.error('Error adding kebutuhan:', error);
    }
  };

      if (response.success) {
        console.log('Add successful - reloading data');
        loadData();
        setShowKebutuhanModal(false);
        setSelectedKapalForKebutuhan(null);
        setNewKebutuhan('');
      }
      console.log('=== END ADD DEBUG ===');
    } catch (error) {
      console.error('Error adding kebutuhan:', error);
    }
  };

  const handleEditKebutuhanClick = (kapal, item) => {
    if (!isItemEditable(kapal, item)) return;
    setEditingKebutuhan({ kapal, item });
    setEditKebutuhanName(item);
    setShowEditKebutuhanModal(true);
  };

  const handleEditKebutuhanConfirm = async () => {
    if (!editKebutuhanName.trim() || !editingKebutuhan) return;

    const { kapal, item: oldItem } = editingKebutuhan;
    const newItemName = editKebutuhanName.trim();

    try {
      console.log('=== EDIT KEBUTUHAN DEBUG ===');
      console.log('Current kapal:', kapal.nama);
      console.log('Old item:', oldItem, 'Old state:', kapal.checklistStates?.[oldItem]);
      console.log('Before - existing checklistStates:', kapal.checklistStates);
      // Update listPersiapan
      const updatedList = (kapal.listPersiapan || []).map(i => i === oldItem ? newItemName : i);

      // Update checklistStates - keep the old state and move it to new key
      const updatedChecklistStates = {};
      Object.keys(kapal.checklistStates || {}).forEach(key => {
        if (key === oldItem) {
          updatedChecklistStates[newItemName] = kapal.checklistStates[key];
        } else {
          updatedChecklistStates[key] = kapal.checklistStates[key];
        }
      });

      // Update checklistDates
      const updatedChecklistDates = {};
      Object.keys(kapal.checklistDates || {}).forEach(key => {
        if (key === oldItem) {
          updatedChecklistDates[newItemName] = kapal.checklistDates[key];
        } else {
          updatedChecklistDates[key] = kapal.checklistDates[key];
        }
      });

      // Update finishedChecklistStates if the item was tracked there
      const updatedFinishedChecklistStates = {};
      Object.keys(kapal.finishedChecklistStates || {}).forEach(key => {
        if (key === oldItem) {
          updatedFinishedChecklistStates[newItemName] = kapal.finishedChecklistStates[key];
        } else {
          updatedFinishedChecklistStates[key] = kapal.finishedChecklistStates[key];
        }
      });

      const response = await kapalMasukAPI.update(token, kapal.id, {
        ...kapal,
        listPersiapan: updatedList,
        checklistStates: updatedChecklistStates,
        checklistDates: updatedChecklistDates,
        finishedChecklistStates: updatedFinishedChecklistStates,
      });

      console.log('After edit update - response:', response);
      console.log('New checklistStates:', updatedChecklistStates);

      if (response.success) {
        console.log('Edit successful - reloading');
        loadData();
        setShowEditKebutuhanModal(false);
        setEditingKebutuhan(null);
        setEditKebutuhanName('');
      }
      console.log('=== END EDIT DEBUG ===');
    } catch (error) {
      console.error('Error editing kebutuhan:', error);
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
      const start = parseIndonesianDate(startDate);
      const end = parseIndonesianDate(endDate);
      if (!start || !end) return '-';
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} hari`;
    } catch {
      return '-';
    }
  };

  // Helper function to parse Indonesian date format (DD/MM/YYYY)
  const parseIndonesianDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      // Try to handle DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        // Create date in local timezone (DD/MM/YYYY)
        return new Date(year, month - 1, day);
      }
      // Fallback to default parsing
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  const calculateDurasiBerlabuh = (tanggalKembali, perkiraanKeberangkatan) => {
    if (!tanggalKembali) return '-';
    try {
      const kembali = parseIndonesianDate(tanggalKembali);
      if (!kembali) return '-';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate days since return (how long has been at port)
      const diffTime = today - kembali;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If the return date is in the future, ship hasn't returned yet
      if (diffDays < 0) {
        return 'Belum kembali';
      }
      
      return `${diffDays} hari`;
    } catch {
      return '-';
    }
  };

const calculateDurasiBerlayar = (kapal) => {
    // Jika kapal belum berlayar (tidak ada tanggal keberangkatan)
    if (!kapal.perkiraanKeberangkatan) return '-';

    try {
      const keberangkatan = parseIndonesianDate(kapal.perkiraanKeberangkatan);
      if (!keberangkatan) return '-';

      // Cek apakah kapal sudah kembali (ada tanggalKembali yang lebih baru dari keberangkatan)
      if (kapal.tanggalKembali) {
        const kembali = parseIndonesianDate(kapal.tanggalKembali);
        if (!kembali) return '-';

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

  // Check if an item was already checked BEFORE departure
  // If kapal.isFinished, only items checked after finish can be modified
  const isItemEditable = (kapal, item) => {
    if (!kapal.isFinished) return true;
    // If finished, check if this item was in the finishedChecklistStates
    // Items not in finishedChecklistStates are new items added after finish
    return !kapal.finishedChecklistStates?.[item];
  };

  // Get owner name for a kapal by matching with kapalList
  const getOwnerName = (kapal) => {
    // Try to find by kapalId first
    if (kapal.kapalId && kapalList.length > 0) {
      const matchedKapal = kapalList.find(k => k.id === kapal.kapalId);
      if (matchedKapal?.namaPemilik) {
        return matchedKapal.namaPemilik;
      }
    }
    // Fallback: find by ship name
    if (kapal.nama && kapalList.length > 0) {
      const matchedKapal = kapalList.find(k => k.nama === kapal.nama);
      if (matchedKapal?.namaPemilik) {
        return matchedKapal.namaPemilik;
      }
    }
    return null;
  };

  // Get unique owner list from kapalList
  const uniqueOwners = [...new Set(kapalList.map(k => k.namaPemilik).filter(Boolean))].sort();

  const filteredKapal = kapalMasukList.filter(kapal => {
    // Filter by owner if selected
    if (selectedOwner && getOwnerName(kapal) !== selectedOwner) {
      return false;
    }
    // Filter by preparation search term
    return kapal.listPersiapan?.some(item => item.toLowerCase().includes(searchTerm.toLowerCase()));
  });

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
        <div className="mb-6 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Cari kebutuhan atau persiapan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">Semua Pemilik</option>
            {uniqueOwners.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
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
                    {getOwnerName(kapal) && (
                      <p className="text-gray-500 text-sm">Pemilik: {getOwnerName(kapal)}</p>
                    )}
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
                      onClick={() => kapal.isFinished ? handleTambahKebutuhan(kapal.id) : handleEdit(kapal)}
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
                      className={`px-3 py-1 rounded transition-colors ${
                        kapal.isFinished
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                      }`}
                      title="Kapal dapat diberangkatkan kapan saja"
                    >
                      {kapal.isFinished ? 'Batal Finish' : 'Berangkatkan'}
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
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {kapal.isFinished ? '✅ Telah Berangkat' : '⏳ Persiapan'}
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
                          disabled={!isItemEditable(kapal, item)}
                          onChange={() => toggleChecklist(kapal, item)}
                          className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${!isItemEditable(kapal, item) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          title={!isItemEditable(kapal, item) ? 'Item ini sudah dicentang sebelum keberangkatan' : ''}
                        />
                        <span 
                          className={`flex-1 ${kapal.checklistStates?.[item] ? 'line-through text-gray-400' : ''} ${isItemEditable(kapal, item) ? 'cursor-pointer hover:text-blue-600' : ''}`}
                          onClick={() => handleEditKebutuhanClick(kapal, item)}
                          title={isItemEditable(kapal, item) ? 'Klik untuk edit nama' : 'Item ini sudah dicentang sebelum keberangkatan'}
                        >
                          {item}
                          {isItemEditable(kapal, item) && (
                            <svg className="inline-block ml-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          )}
                          {kapal.isFinished && !isItemEditable(kapal, item) && (
                            <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                              Sebelum Berangkat
                            </span>
                          )}
                          {kapal.isFinished && isItemEditable(kapal, item) && (
                            <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                              Setelah Berangkat
                            </span>
                          )}
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

      {/* Edit Kebutuhan Modal */}
      {showEditKebutuhanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Edit Kebutuhan</h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Kebutuhan
                </label>
                <input
                  type="text"
                  value={editKebutuhanName}
                  onChange={(e) => setEditKebutuhanName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditKebutuhanConfirm()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Masukkan nama kebutuhan..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowEditKebutuhanModal(false);
                    setEditingKebutuhan(null);
                    setEditKebutuhanName('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleEditKebutuhanConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!editKebutuhanName.trim()}
                >
                  Simpan
                </button>
                <button
                  onClick={() => {
                    if (editingKebutuhan && window.confirm('Apakah Anda yakin ingin menghapus kebutuhan ini?')) {
                      const { kapal, item } = editingKebutuhan;
                      const updatedList = (kapal.listPersiapan || []).filter(i => i !== item);
                      const updatedChecklistStates = { ...kapal.checklistStates };
                      const updatedChecklistDates = { ...kapal.checklistDates };
                      delete updatedChecklistStates[item];
                      delete updatedChecklistDates[item];
                      
                      const updatedFinishedChecklistStates = { ...kapal.finishedChecklistStates };
                      delete updatedFinishedChecklistStates[item];

                      kapalMasukAPI.update(token, kapal.id, {
                        ...kapal,
                        listPersiapan: updatedList,
                        checklistStates: updatedChecklistStates,
                        checklistDates: updatedChecklistDates,
                        finishedChecklistStates: updatedFinishedChecklistStates,
                      }).then(() => {
                        loadData();
                        setShowEditKebutuhanModal(false);
                        setEditingKebutuhan(null);
                        setEditKebutuhanName('');
                      });
                    }
                  }}
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

