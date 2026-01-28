import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalMasukAPI, kapalAPI } from '../services/api';

const KapalMasuk = () => {
  const { token, socket } = useAuth();
  const [kapalMasukList, setKapalMasukList] = useState([]);
  const [kapalList, setKapalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    kapalId: '',
    nama: '',
    tanggalKembali: '',
    status: '',
    listPersiapan: [],
  });
  const [newPersiapan, setNewPersiapan] = useState('');

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

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kapal masuk ini?')) {
      try {
        const response = await kapalMasukAPI.delete(token, id);
        if (response.success) {
          loadData();
        }
      } catch (error) {
        console.error('Error deleting kapal masuk:', error);
      }
    }
  };

  const handleFinish = async (kapal) => {
    const date = prompt('Masukkan tanggal keberangkatan (YYYY-MM-DD):');
    if (!date) return;

    try {
      const response = await kapalMasukAPI.update(token, kapal.id, {
        ...kapal,
        isFinished: true,
        perkiraanKeberangkatan: date,
        tanggalBerangkat: date,
      });
      if (response.success) {
        loadData();
      }
    } catch (error) {
      console.error('Error finishing kapal:', error);
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

  const toggleChecklist = async (kapal, item) => {
    const isChecked = kapal.checklistStates?.[item];
    const newStates = { ...kapal.checklistStates, [item]: !isChecked };

    try {
      await kapalMasukAPI.update(token, kapal.id, {
        ...kapal,
        checklistStates: newStates,
      });
      loadData();

      if (socket) {
        socket.emit('update-checklist', {
          kapalId: kapal.id,
          item,
          checked: !isChecked,
          date: !isChecked ? new Date().toLocaleDateString('id-ID') : '',
        });
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
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

  const filteredKapal = kapalMasukList.filter(kapal =>
    kapal.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kapal.status?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold">Kapal Masuk</h1>
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
            + Tambah Kapal Masuk
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari kapal..."
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
              <div key={kapal.id} className="bg-white rounded-lg shadow p-6">
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
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(kapal)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => kapal.isFinished ? handleUnfinish(kapal) : handleFinish(kapal)}
                      className={`px-3 py-1 rounded transition-colors ${
                        kapal.isFinished
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {kapal.isFinished ? 'Batal Finish' : 'Finish'}
                    </button>
                    <button
                      onClick={() => handleDelete(kapal.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
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
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`flex-1 ${kapal.checklistStates?.[item] ? 'line-through text-gray-400' : ''}`}>
                          {item}
                        </span>
                        <span className="text-sm text-gray-500">
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
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingKapal ? 'Edit Kapal Masuk' : 'Tambah Kapal Masuk Baru'}
              </h2>
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
                  className="input-field"
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
                <input
                  type="date"
                  value={formData.tanggalKembali}
                  onChange={(e) => setFormData({ ...formData, tanggalKembali: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <input
                  type="text"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
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
                    className="input-field flex-1"
                    placeholder="Tambah persiapan..."
                  />
                  <button
                    type="button"
                    onClick={addPersiapan}
                    className="btn-primary"
                  >
                    Tambah
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {formData.listPersiapan.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded">
                      <span className="flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() => removePersiapan(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
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

export default KapalMasuk;
