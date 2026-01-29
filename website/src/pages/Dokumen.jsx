import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalAPI, dokumenAPI, uploadAPI, migrationAPI } from '../services/api';
import API_BASE_URL from '../services/api';
import DatePicker from '../components/DatePicker';

const Dokumen = () => {
  const { token } = useAuth();
  const [kapalList, setKapalList] = useState([]);
  const [selectedKapal, setSelectedKapal] = useState(null);
  const [dokumenList, setDokumenList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedDateDokumen, setSelectedDateDokumen] = useState(null);
  const [tempDate, setTempDate] = useState('');
  const [selectedDokumen, setSelectedDokumen] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState([]);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [formData, setFormData] = useState({
    kapalId: '',
    nama: '',
    jenis: '',
    tanggalKadaluarsa: '',
    filePath: '',
  });
  const [editingDokumen, setEditingDokumen] = useState(null);
  const fileInputRef = useRef(null);

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
        const kapalData = data.data || [];
        // Check for expiring documents for each ship
        const kapalWithExpiryStatus = await Promise.all(
          kapalData.map(async (kapal) => {
            try {
              const dokumenData = await dokumenAPI.getByKapalId(token, kapal.id);
              if (dokumenData.success) {
                const hasExpiring = dokumenData.data?.some(dokumen =>
                  isExpiringSoon(dokumen.tanggalKadaluarsa)
                ) || false;
                return { ...kapal, hasExpiringDocuments: hasExpiring };
              }
              return { ...kapal, hasExpiringDocuments: false };
            } catch (error) {
              console.error(`Error checking documents for kapal ${kapal.id}:`, error);
              return { ...kapal, hasExpiringDocuments: false };
            }
          })
        );
        setKapalList(kapalWithExpiryStatus);
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

      let response;
      if (editingDokumen) {
        response = await dokumenAPI.update(token, editingDokumen.id, payload);
      } else {
        response = await dokumenAPI.create(token, payload);
      }

      if (response.success) {
        setShowModal(false);
        setShowEditModal(false);
        setFormData({
          kapalId: '',
          nama: '',
          jenis: '',
          tanggalKadaluarsa: '',
          filePath: '',
        });
        setEditingDokumen(null);
        if (selectedKapal) {
          loadDokumenForKapal(selectedKapal.id);
        }
      }
    } catch (error) {
      console.error('Error saving dokumen:', error);
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
      // Validate inputs
      if (!newDate || newDate.trim() === '') {
        alert('ERROR: Tanggal tidak boleh kosong');
        return;
      }

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert('ERROR: Format tanggal tidak valid');
        return;
      }

      const dokumen = dokumenList.find(d => d.id === id);
      if (!dokumen) {
        alert('ERROR: Dokumen tidak ditemukan');
        return;
      }

      const payload = {
        kapalId: dokumen.kapalid || dokumen.kapalId,
        nama: dokumen.nama,
        jenis: dokumen.jenis,
        nomor: dokumen.nomor || null,
        tanggalTerbit: dokumen.tanggalterbit || null,
        tanggalKadaluarsa: newDate,
        status: dokumen.status || 'aktif',
        filePath: dokumen.filePath || null,
      };

      const response = await dokumenAPI.update(token, id, payload);

      if (response.success) {
        if (selectedKapal) {
          loadDokumenForKapal(selectedKapal.id);
        }
      } else {
        alert('Gagal memperbarui tanggal: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      alert('ERROR: ' + error.message);
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const uploadedFiles = [];
    let completed = 0;

    for (const file of files) {
      try {
        const response = await uploadAPI.upload(token, file);
        if (response.success) {
          // Use backend URL for file access
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://aplikasi-kapal-production.up.railway.app';
          uploadedFiles.push(response.data.url || `${backendUrl}/uploads/${response.data.filename}`);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
      
      completed++;
      setUploadProgress(Math.round((completed / files.length) * 100));
    }

    // Update formData with new file paths
    const existingFiles = parseFilePath(formData.filePath || editingDokumen?.filePath);
    const isImage = files[0].type.startsWith('image/');
    
    if (isImage) {
      existingFiles.images = [...existingFiles.images, ...uploadedFiles];
    } else {
      existingFiles.pdfs = [...existingFiles.pdfs, ...uploadedFiles];
    }

    setFormData({
      ...formData,
      filePath: JSON.stringify(existingFiles),
    });

    setUploading(false);
    setUploadProgress(0);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenFileModal = (dokumen) => {
    setEditingDokumen(dokumen);
    setFormData({
      kapalId: dokumen.kapalid?.toString() || selectedKapal?.id?.toString() || '',
      nama: dokumen.nama || '',
      jenis: dokumen.jenis || '',
      tanggalKadaluarsa: dokumen.tanggalKadaluarsa || '',
      filePath: dokumen.filePath || '',
    });
    setShowFileModal(true);
  };

  const handleEditDokumen = (dokumen) => {
    setEditingDokumen(dokumen);
    setFormData({
      kapalId: dokumen.kapalId?.toString() || selectedKapal?.id?.toString() || '',
      nama: dokumen.nama || '',
      jenis: dokumen.jenis || '',
      tanggalKadaluarsa: dokumen.tanggalKadaluarsa || '',
      filePath: dokumen.filepath || '',
    });
    setShowEditModal(true);
  };

  const handleSaveFiles = async () => {
    try {
      const payload = {
        kapalId: editingDokumen.kapalid || editingDokumen.kapalId,
        nama: editingDokumen.nama,
        jenis: editingDokumen.jenis,
        nomor: editingDokumen.nomor || null,
        tanggalTerbit: editingDokumen.tanggalterbit || null,
        tanggalKadaluarsa: editingDokumen.tanggalKadaluarsa,
        status: editingDokumen.status || 'aktif',
        filePath: formData.filePath || editingDokumen.filePath,
      };

      const response = await dokumenAPI.update(token, editingDokumen.id, payload);

      if (response.success) {
        setShowFileModal(false);
        setEditingDokumen(null);
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
      console.error('Error saving files:', error);
    }
  };

  const handleRemoveFile = (type, index) => {
    const files = parseFilePath(formData.filePath || editingDokumen?.filePath);

    if (type === 'images') {
      files.images.splice(index, 1);
    } else {
      files.pdfs.splice(index, 1);
    }

    setFormData({
      ...formData,
      filePath: JSON.stringify(files),
    });
  };

  const openImageViewer = (images, index) => {
    setSelectedImages(images);
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  const openPdf = (pdfUrl) => {
    window.open(pdfUrl, '_blank');
  };

  const handleMigrateFileUrls = async () => {
    if (window.confirm('Apakah Anda yakin ingin menjalankan migrasi URL file? Ini akan mengubah semua URL file dari localhost ke Railway URL.')) {
      setMigrating(true);
      setMigrationLogs([]);
      try {
        const response = await migrationAPI.migrateFileUrls(token);
        if (response.success) {
          setMigrationLogs(response.data.logs || []);
          setShowMigrationModal(true);
          // Reload dokumen to reflect changes
          if (selectedKapal) {
            loadDokumenForKapal(selectedKapal.id);
          }
        } else {
          alert('Migrasi gagal: ' + (response.message || 'Unknown error'));
        }
      } catch (error) {
        alert('Error migrasi: ' + error.message);
      } finally {
        setMigrating(false);
      }
    }
  };

  const openPdfSelection = (pdfs) => {
    if (pdfs.length === 1) {
      openPdf(pdfs[0]);
    } else {
      // Show selection modal
      const pdfNames = pdfs.map((pdf, idx) => ({
        name: `PDF ${idx + 1}`,
        url: pdf,
      }));
      
      // Use browser's native selection
      const selection = window.prompt(
        `Pilih PDF yang ingin dibuka:\n${pdfNames.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nMasukkan nomor PDF:`
      );
      
      const selectedIndex = parseInt(selection) - 1;
      if (selectedIndex >= 0 && selectedIndex < pdfs.length) {
        openPdf(pdfs[selectedIndex]);
      }
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
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingDokumen(null);
                  setFormData({
                    kapalId: selectedKapal.id.toString(),
                    nama: '',
                    jenis: '',
                    tanggalKadaluarsa: '',
                    filePath: '',
                  });
                  setShowModal(true);
                }}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                + Tambah Dokumen
              </button>
              <button
                onClick={handleMigrateFileUrls}
                disabled={migrating}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrating ? 'Memigrasi...' : 'Migrasi File'}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Ship Selection */}
        {!selectedKapal && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Pilih Kapal:</h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Selected Ship Documents */}
        {selectedKapal && (
          <>
            <div className="mb-6 flex items-center justify-between">
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
                  // Use updated filePath if this document is being edited
                  const currentFilePath = (editingDokumen && editingDokumen.id === dokumen.id) ? formData.filePath : dokumen.filePath;
                  const { images, pdfs } = parseFilePath(currentFilePath);
                  const expired = isExpiringSoon(dokumen.tanggalKadaluarsa);

                  // Debug logging
                  console.log(`Dokumen ${dokumen.id} (${dokumen.jenis}): filePath =`, currentFilePath);
                  console.log(`Parsed - Images: ${images.length}, PDFs: ${pdfs.length}`);

                  return (
                    <div key={dokumen.id || Math.random()} className={`bg-white rounded-lg shadow p-6 ${expired ? 'border-l-4 border-red-500' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-800">{dokumen.jenis || dokumen.nama || 'Dokumen'}</h3>
                            {expired && (
                              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                                Segera Expired
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm">Tanggal Kadaluarsa: {formatDate(dokumen.tanggalKadaluarsa)}</p>

                          {/* Count of Images */}
                          <div className="mt-3">
                            <button
                              onClick={() => images.length > 0 ? openImageViewer(images, 0) : alert('Tidak ada gambar untuk ditampilkan')}
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              Lihat Gambar: {images.length}
                            </button>
                          </div>

                          {/* Count of PDFs */}
                          <div className="mt-1">
                            <button
                              onClick={() => pdfs.length > 0 ? openPdfSelection(pdfs) : alert('Tidak ada PDF untuk ditampilkan')}
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              Lihat PDF: {pdfs.length}
                            </button>
                          </div>

                          {/* Images Thumbnails - only show if there are images */}
                          {images.length > 0 && (
                            <div className="mt-3">
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {images.map((img, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => openImageViewer(images, idx)}
                                    className="inline-block"
                                  >
                                    <img
                                      src={img}
                                      alt={`Gambar ${idx + 1}`}
                                      className="w-20 h-20 object-cover rounded border hover:opacity-75"
                                      onError={(e) => e.target.style.display = 'none'}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PDFs - only show if there are PDFs */}
                          {pdfs.length > 0 && (
                            <div className="mt-3">
                              <div className="flex gap-2 mt-1">
                                {pdfs.map((pdf, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => openPdfSelection(pdfs)}
                                    className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    PDF {idx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleOpenFileModal(dokumen)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDateDokumen(dokumen);
                              // Convert DD/MM/YYYY to YYYY-MM-DD format for DatePicker
                              const dateStr = dokumen.tanggalKadaluarsa || '';
                              let formattedDate = '';
                              if (dateStr && dateStr.includes('/')) {
                                const [day, month, year] = dateStr.split('/');
                                formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                              } else {
                                formattedDate = dateStr;
                              }
                              setTempDate(formattedDate);
                              setShowDateModal(true);
                            }}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Ubah Tgl
                          </button>
                          <button
                            onClick={() => handleDelete(dokumen.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tambah Dokumen Baru</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Dokumen *</label>
                <input
                  type="text"
                  value={formData.jenis}
                  onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Masukkan jenis dokumen"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kadaluarsa</label>
                <DatePicker
                  selected={formData.tanggalKadaluarsa || null}
                  onChange={(date) => setFormData({ ...formData, tanggalKadaluarsa: date })}
                  placeholderText="Pilih tanggal"
                />
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
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {showEditModal && editingDokumen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Edit Dokumen</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Dokumen *</label>
                <input
                  type="text"
                  value={formData.jenis}
                  onChange={(e) => setFormData({ ...formData, jenis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Masukkan jenis dokumen"
                  required={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kadaluarsa</label>
                <DatePicker
                  selected={formData.tanggalKadaluarsa || null}
                  onChange={(date) => setFormData({ ...formData, tanggalKadaluarsa: date })}
                  placeholderText="Pilih tanggal"
                />
              </div>

              {/* File Management Section */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Kelola File:</h3>

                {/* Existing Files */}
                {(() => {
                  const files = parseFilePath(formData.filePath || editingDokumen?.filepath);
                  const hasFiles = files.images.length > 0 || files.pdfs.length > 0;

                  if (hasFiles) {
                    return (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">File yang sudah ada:</h4>

                        {files.images.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-2">Gambar ({files.images.length}):</p>
                            <div className="flex flex-wrap gap-2">
                              {files.images.map((img, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={img}
                                    alt={`Gambar ${idx + 1}`}
                                    className="w-20 h-20 object-cover rounded border"
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile('images', idx)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {files.pdfs.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-2">PDF ({files.pdfs.length}):</p>
                            <div className="space-y-1">
                              {files.pdfs.map((pdf, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
                                  <span className="text-sm">PDF {idx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile('pdfs', idx)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Upload New Files */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="edit-file-upload"
                  />
                  <label htmlFor="edit-file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-gray-600 text-sm">Tambah file baru</p>
                      <p className="text-xs text-gray-500">Gambar atau PDF</p>
                    </div>
                  </label>

                  {uploading && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Mengupload... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Kelola File Dokumen</h2>
              <button onClick={() => setShowFileModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Existing Files */}
              {(() => {
                const files = parseFilePath(formData.filePath || editingDokumen?.filePath);
                const hasFiles = files.images.length > 0 || files.pdfs.length > 0;

                if (hasFiles) {
                  return (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">File yang sudah ada:</h3>

                      {files.images.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-2">Gambar:</p>
                          <div className="flex flex-wrap gap-2">
                            {files.images.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={img}
                                  alt={`Gambar ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded border"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                                <button
                                  onClick={() => handleRemoveFile('images', idx)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {files.pdfs.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">PDF:</p>
                          <div className="space-y-1">
                            {files.pdfs.map((pdf, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
                                <span className="text-sm">PDF {idx + 1}</span>
                                <button
                                  onClick={() => handleRemoveFile('pdfs', idx)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Hapus
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Upload Section */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Tambah File Baru:</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-600">Klik untuk upload gambar atau PDF</p>
                      <p className="text-xs text-gray-500">Mendukung multiple file</p>
                    </div>
                  </label>

                  {uploading && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Mengupload... {uploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveFiles}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setShowImageViewer(false)}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
          >
            ×
          </button>
          
          {/* Previous Button */}
          {currentImageIndex > 0 && (
            <button
              onClick={() => setCurrentImageIndex(prev => prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 p-2"
            >
              ‹
            </button>
          )}
          
          {/* Image */}
          <img
            src={selectedImages[currentImageIndex]}
            alt={`Gambar ${currentImageIndex + 1}`}
            className="max-w-full max-h-screen object-contain"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" fill="white">Gambar tidak tersedia</text></svg>';
            }}
          />
          
          {/* Next Button */}
          {currentImageIndex < selectedImages.length - 1 && (
            <button
              onClick={() => setCurrentImageIndex(prev => prev + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 p-2"
            >
              ›
            </button>
          )}
          
          {/* Image Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
            {currentImageIndex + 1} / {selectedImages.length}
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDateModal && selectedDateDokumen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Ubah Tanggal Kadaluarsa</h2>
              <button onClick={() => setShowDateModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Dokumen:</p>
                <p className="font-medium text-gray-800">{selectedDateDokumen.jenis || selectedDateDokumen.nama}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kadaluarsa Baru</label>
                <DatePicker
                  selected={tempDate || null}
                  onChange={(date) => {
                    console.log('DatePicker onChange called with:', date);
                    setTempDate(date);
                  }}
                  placeholderText="Pilih tanggal"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDateModal(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    handleUpdateExpiry(selectedDateDokumen.id, tempDate);
                    setShowDateModal(false);
                    setSelectedDateDokumen(null);
                    setTempDate('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Migration Modal */}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Migration Logs</h2>
              <button onClick={() => setShowMigrationModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
                {migrationLogs.length === 0 ? (
                  <p className="text-gray-500">No logs available</p>
                ) : (
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {migrationLogs.join('\n')}
                  </pre>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowMigrationModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dokumen;

