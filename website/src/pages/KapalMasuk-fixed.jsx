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
  }, [kapalMasukList, token, newKebutuhan, selectedKapalForKebutuhan]);

  // Rest of your code stays the same...

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Your JSX */}
      {/* ... */}
      <button onClick={handleTambahKebutuhanConfirm}>
        Tambah
      </button>
    </div>
  );
};

export default KapalMasuk;
