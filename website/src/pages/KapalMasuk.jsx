import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { kapalAPI } from '../services/api';
import { kapalMasukAPI, statusKerjaKapalAPI, dokumenPersiapanAPI, uploadAPI } from '../services/api';
import DatePicker from '../components/DatePicker';

const KapalMasuk = () => {
  const { token, socket } = useAuth();

  const [kapalMasukList, setKapalMasukList] = useState([]);
  const [persiapanList, setPersiapanList] = useState([]);
  const [berlayarList, setBerlayarList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [kapalList, setKapalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [selectedKapalMasuk, setSelectedKapalMasuk] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [checkDateModal, setCheckDateModal] = useState(null);
  const [dokumenModal, setDokumenModal] = useState(null);
  const [dokumenForm, setDokumenForm] = useState({ nama: '', tanggalKadaluarsa: '' });
  const [dokumenFiles, setDokumenFiles] = useState([]);
  const [dokumenSaving, setDokumenSaving] = useState(false);
  const [dokumenPersiapanList, setDokumenPersiapanList] = useState([]);

  const [newKebutuhan, setNewKebutuhan] = useState('');
  const [showKebutuhanModal, setShowKebutuhanModal] = useState(false);
  const [selectedKapalForKebutuhan, setSelectedKapalForKebutuhan] = useState(null);
  const [kebutuhanTargetValid, setKebutuhanTargetValid] = useState(false);

  const [formData, setFormData] = useState({
    kapalId: '',
    nama: '',
    tanggalKembali: '',
    status: '',
    listPersiapan: [],
  });

  useEffect(() => {
    if (token) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Socket real-time dimatikan sementara untuk memastikan checklist hanya pakai REST PUT.
  // Real-time update bisa diaktifkan kembali setelah checklist REST stabil.
  useEffect(() => {
    if (!socket) return;
    return () => {};
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

  // Durasi hari antara keberangkatan dan berlabuh (atau hari ini bila masih berlayar).
  const hitungDurasiBerlayar = (kapal) => {
    const start = safeDateParse(kapal?.tanggalKeberangkatan);
    if (!start) return null;
    const end = safeDateParse(kapal?.tanggalKembali) || new Date();
    return Math.max(0, Math.floor((end - start) / 86400000));
  };

  const safeProcessKapal = (kapal) => ({
    ...kapal,
    checklistStates: kapal.checklistStates || {},
    checklistDates: kapal.checklistDates || {},
    finishedChecklistStates: kapal.finishedChecklistStates || {},
    safeTanggalKembali: safeDateParse(kapal.tanggalKembali),
    safeTanggalBerangkat: safeDateParse(kapal.tanggalBerangkat),
    safeTanggalKeberangkatan: safeDateParse(kapal.tanggalKeberangkatan),
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('berlayar') || s === 'sailing') {
      return { icon: '🛥️', text: 'Berlayar', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (s.includes('menepi') || s === 'docked') {
      return { icon: '⚓', text: 'Berlabuh', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    return { icon: '⏳', text: status || 'Persiapan', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  };

  const getChecklistProgress = (kapal) => {
    const items = kapal.listPersiapan || [];
    const states = kapal.checklistStates || {};
    const checked = items.filter((item) => states[item]).length;
    const total = items.length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { checked, total, percent };
  };

  // NOTE: untuk menampilkan data railway fully, tidak dipotong slice.
  const getKebutuhanSection = (kapal, isCompact = true, onToggle, isItemLocked) => {
    const listPersiapan = kapal.listPersiapan || [];
    const isEmpty = listPersiapan.length === 0;
    const progress = getChecklistProgress(kapal);
    const itemsToShow = listPersiapan; // full

    if (isEmpty) {
      const defaults = [
        `Persiapan umum untuk "${kapal.nama || 'kapal'}"`,
        ...(kapal.namaPemilik ? [`Cek dokumen pemilik: ${kapal.namaPemilik}`] : []),
        ...(kapal.tandaSelar ? [`Verifikasi tanda selar: ${kapal.tandaSelar}`] : []),
        ...(kapal.tandaPengenal ? [`Cek tanda pengenal: ${kapal.tandaPengenal}`] : []),
        ...(kapal.jenisAlatTangkap ? [`Persiapan alat tangkap: ${kapal.jenisAlatTangkap}`] : []),
        'Persiapan mesin dan bahan bakar',
        'Cek navigasi dan alat komunikasi',
        'Pemeriksaan keselamatan kru',
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
            <label
              key={item}
              className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-yellow-400 hover:bg-yellow-100 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={kapal.checklistStates?.[item] || false}
                onChange={() => onToggle && !isItemLocked?.(item) && onToggle(item)}
                disabled={!onToggle || !!isItemLocked?.(item)}
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

      // 1) Ambil data status (persiapan/berlayar) dari endpoint status-kerja
      const [kapalStatusRes] = await Promise.all([
        statusKerjaKapalAPI.getStatusKerja(token),
      ]);

      // IMPORTANT: kapal_masuk record id (untuk PUT) ada di tabel kapal_masuk.
      // Jangan gunakan statusKerja endpoint sebagai sumber id PUT.
      // Persiapan/Berlayar hanya butuh daftar kapal (kapal_info), sehingga id PUT
      // harus dibuat via POST kapal_masuk saat aksi (+Kebutuhan/checklist/Finish).


      // Filter agar tidak ada item dengan id invalid (null/0/NaN) masuk ke UI
      // Backend bisa kirim field id sebagai `id` atau `kapalId`, jadi ambil keduanya.
      const getKapalMasukIdNum = (k) => {
        const candidate = k?.id ?? k?.kapalId ?? k?.kapal_id;
        const idNum = Number(candidate);
        return idNum;
      };

      const filterValid = (arr) =>
        (Array.isArray(arr) ? arr : []).filter((k) => {
          const idNum = getKapalMasukIdNum(k);
          return Number.isFinite(idNum) && idNum > 0;
        });

      // diagnosa bentuk data
      console.log('[loadData] kapalStatusRes.data keys:', Object.keys(kapalStatusRes?.data || {}));
      console.log(
        '[loadData] persiapan isArray:',
        Array.isArray(kapalStatusRes?.data?.persiapan),
        'len:',
        kapalStatusRes?.data?.persiapan?.length
      );
      console.log(
        '[loadData] berlayar isArray:',
        Array.isArray(kapalStatusRes?.data?.berlayar),
        'len:',
        kapalStatusRes?.data?.berlayar?.length
      );

      const rawPersiapan = kapalStatusRes?.data?.persiapan;
      const rawBerlayar = kapalStatusRes?.data?.berlayar;
      setHistoryList(Array.isArray(kapalStatusRes?.data?.history) ? kapalStatusRes.data.history : []);

      try {
        const dokRes = await dokumenPersiapanAPI.getAll(token);
        setDokumenPersiapanList(dokRes?.success && Array.isArray(dokRes.data) ? dokRes.data : []);
      } catch (dokErr) {
        console.warn('Dokumen persiapan gagal dimuat:', dokErr);
      }

      const filteredPersiapan = filterValid(rawPersiapan);
      const filteredBerlayar = filterValid(rawBerlayar);

      const useStatusKerjaLists =
        filteredPersiapan.length > 0 || filteredBerlayar.length > 0;

      // 2) Ambil daftar kapal dari kapal_info (harus selalu ada untuk tampilan persiapan)
      const kapalRes = await kapalAPI.getAll(token);

      let kapalInfoList = [];
      if (kapalRes.success && Array.isArray(kapalRes.data)) {
        kapalInfoList = kapalRes.data;
        setKapalList(kapalRes.data);
      } else {
        setKapalList([]);
        kapalInfoList = [];
        console.warn('Kapal API failed:', kapalRes);
      }

      // 3) Bangun default: semua kapal_info -> persiapan (berlayar kosong)
      // IMPORTANT:
      // - UI butuh id valid agar tombol +Kebutuhan bisa ditekan.
      // - id yang dipakai untuk PUT /api/kapal-masuk/:id HARUS id record kapal_masuk,
      //   sehingga PUT/POST tetap dilakukan via lookup relasi kapalId (lihat handler).
      // Karena itu: id UI kita set = id kapal_info (k.id) (valid).
      const semuaPersiapanDariKapalInfo = kapalInfoList.map((k) => ({
        // Map yang UI butuhkan
        id: k.id,
        kapalId: k.id,


        nama: k.nama,
        namaPemilik: k.namaPemilik,
        tandaSelar: k.tandaSelar,
        tandaPengenal: k.tandaPengenal,
        beratKotor: k.beratKotor,
        beratBersih: k.beratBersih,
        merekMesin: k.merekMesin,
        nomorSeriMesin: k.nomorSeriMesin,
        jenisAlatTangkap: k.jenisAlatTangkap,

        // checklist/aksi berbasis kapal_masuk schema, default kosong
        tanggalInput: k.tanggalInput || '',
        tanggalKeberangkatan: '',
        tanggalBerangkat: '',
        tanggalKembali: '',
        listPersiapan: k.listPersiapan || [],
        checklistStates: {},
        checklistDates: {},
        finishedChecklistStates: {},

        // status kerja default persiapan
        statusKerja: k.statusKerja || k.status || 'persiapan',
        status: k.status || '',
        perkiraanKeberangkatan: '',
        durasiSelesaiPersiapan: '',
        durasiBerlayar: '',
        isFinished: false,
      }));

      // 4) Jika statusKerja sukses dan berisi, override default dengan data statusKerja
      if (useStatusKerjaLists) {
        setPersiapanList(filteredPersiapan);
        setBerlayarList(filteredBerlayar);

        // gabungan untuk kebutuhan checklist/finish/menepi
        setKapalMasukList(filteredPersiapan.concat(filteredBerlayar));
      } else {
        setPersiapanList(semuaPersiapanDariKapalInfo);
        setBerlayarList([]);

        // checklist/finish/menepi butuh record kapal_masuk,
        // namun agar UI tetap tampil, gunakan map default dari kapal_info.
        // (Finish tetap membutuhkan record kapal_masuk yang ada, tapi tab tetap terisi sesuai permintaan.)
        setKapalMasukList(semuaPersiapanDariKapalInfo);
      }

    } catch (e) {
      setError(`Gagal memuat data: ${e.message || 'Unknown error'}`);
      setKapalMasukList([]);
      setKapalList([]);
      setPersiapanList([]);
      setBerlayarList([]);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  };

  const isValidKapalId = useCallback((kapalId) => {
    const kapalIdNum = Number(kapalId);
    return !(
      kapalId === null ||
      kapalId === undefined ||
      kapalId === '' ||
      kapalId === 'null' ||
      (typeof kapalId === 'string' && kapalId.trim() === '') ||
      Number.isNaN(kapalIdNum) ||
      kapalIdNum <= 0
    );
  }, []);

  const handleTambahKebutuhan = useCallback(
    (kapalId) => {
      const kapalIdNum = Number(kapalId);

      if (!isValidKapalId(kapalId)) {
        console.warn('[TambahKebutuhan] invalid kapalId:', kapalId, 'kapalIdNum:', kapalIdNum);
        alert('Kapal tidak valid untuk tambah kebutuhan');
        return;
      }

      const currentKapal = kapalMasukList.find((k) => Number(k.kapalId ?? k.id) === kapalIdNum);
      if (!currentKapal) {
        console.warn('[TambahKebutuhan] currentKapal tidak ditemukan untuk kapalId:', kapalIdNum);
        alert('Kapal tidak valid untuk tambah kebutuhan');
        return;
      }

      setSelectedKapalForKebutuhan({ ...currentKapal, id: kapalIdNum });
      setNewKebutuhan('');
      setKebutuhanTargetValid(true);
      setShowKebutuhanModal(true);
    },
    [kapalMasukList, isValidKapalId]
  );

  useEffect(() => {
    if (!showKebutuhanModal) return;

    const valid = isValidKapalId(selectedKapalForKebutuhan?.id);
    setKebutuhanTargetValid(valid);

    if (!valid) {
      setShowKebutuhanModal(false);
      setSelectedKapalForKebutuhan(null);
      setNewKebutuhan('');
    }
  }, [showKebutuhanModal, selectedKapalForKebutuhan, isValidKapalId]);

  const handleTambahKebutuhanConfirm = useCallback(async () => {
    const kebutuhanTrim = newKebutuhan.trim();
    if (!kebutuhanTrim) return;
    if (!selectedKapalForKebutuhan) return;

    // kapalId dari modal = id kapal_info (bukan id record kapal_masuk)
    const kapalId = selectedKapalForKebutuhan?.id;

    // defensif: tolak null/undefined/"null"/""/NaN/<=0 sebelum create/update
    if (!kebutuhanTargetValid || !isValidKapalId(kapalId)) {
      const kapalIdNum = Number(kapalId);
      console.warn('[TambahKebutuhanConfirm] blocked invalid kapalId:', kapalId, 'kapalIdNum:', kapalIdNum);
      alert('Kapal tidak valid untuk tambah kebutuhan');
      return;
    }

    const kapalIdNum = Number(kapalId);
    if (!Number.isFinite(kapalIdNum) || kapalIdNum <= 0) return;

    try {
      // Cari record kapal_masuk berdasarkan relasi kapalId
      const recordFromList = kapalMasukList.find((k) => Number(k.kapalId) === kapalIdNum);
      let kapalMasukRecord = recordFromList;

      // Jika belum ada record kapal_masuk, buat dulu agar punya id untuk PUT
      if (!kapalMasukRecord || !Number.isFinite(Number(kapalMasukRecord.id)) || Number(kapalMasukRecord.id) <= 0) {
        const kapalInfoSource = kapalList.find((k) => Number(k.id) === kapalIdNum);
        if (!kapalInfoSource) throw new Error('kapal info not found');

        const createPayload = {
          kapalId: kapalIdNum,
          nama: kapalInfoSource.nama || '',
          namaPemilik: kapalInfoSource.namaPemilik || '',
          tandaSelar: kapalInfoSource.tandaSelar || '',
          tandaPengenal: kapalInfoSource.tandaPengenal || '',
          beratKotor: kapalInfoSource.beratKotor || '',
          beratBersih: kapalInfoSource.beratBersih || '',
          merekMesin: kapalInfoSource.merekMesin || '',
          nomorSeriMesin: kapalInfoSource.nomorSeriMesin || '',
          jenisAlatTangkap: kapalInfoSource.jenisAlatTangkap || '',
          listPersiapan: kapalInfoSource.listPersiapan || [],
          statusKerja: 'persiapan',
          checklistStates: {},
          checklistDates: {},
          finishedChecklistStates: {},
          isFinished: false,
        };

        const created = await kapalMasukAPI.create(token, createPayload);
        if (!created?.success) throw new Error(created?.message || 'Gagal create kapal-masuk');

        await loadData();

        // Ambil ulang record kapal_masuk terbaru
        const refreshed = kapalMasukList.find((k) => Number(k.kapalId) === kapalIdNum);
        kapalMasukRecord = refreshed || created.data;
      }

      if (!kapalMasukRecord) throw new Error('kapal-masuk record not found after create');

      // HARD GUARD: pastikan id yang dipakai PUT adalah record kapal_masuk yang benar-benar terkait kapalId
      const recordIdNum = Number(kapalMasukRecord.id);
      if (!Number.isFinite(recordIdNum) || recordIdNum <= 0) {
        throw new Error('kapal-masuk record id invalid');
      }
      if (Number(kapalMasukRecord.kapalId) !== kapalIdNum) {
        // mismatch relasi, re-fetch via POST lalu lookup ulang
        await loadData();
        const retryRecord = (kapalMasukList || []).find((k) => Number(k.kapalId) === kapalIdNum);
        if (!retryRecord || Number(retryRecord.id) <= 0) {
          throw new Error('kapal-masuk record relasi mismatch');
        }
        kapalMasukRecord = retryRecord;
      }

      const currentStates = kapalMasukRecord.checklistStates || {};

      const updatedChecklistStates = { ...currentStates, [kebutuhanTrim]: false };

      const currentDates = kapalMasukRecord.checklistDates || {};
      const updatedChecklistDates = { ...currentDates, [kebutuhanTrim]: '' };

      const updatePayload = {
        ...kapalMasukRecord,
        addKebutuhan: kebutuhanTrim,
        checklistStates: updatedChecklistStates,
        checklistDates: updatedChecklistDates,
      };

      console.log('[TambahKebutuhanConfirm] PUT kapal-masuk record id=', recordIdNum);

      const response = await kapalMasukAPI.updateByKapalId(token, kapalIdNum, updatePayload);

      if (response.success) {
        const savedList = response.data?.listPersiapan;
        if (!Array.isArray(savedList) || !savedList.includes(kebutuhanTrim)) {
          throw new Error('Kebutuhan belum terkonfirmasi tersimpan. Muat ulang data dan coba lagi.');
        }
        const savedChecklistStates = response.data?.checklistStates || updatedChecklistStates;
        const savedChecklistDates = response.data?.checklistDates || updatedChecklistDates;
        const updateVessel = (list) =>
          list.map((kapal) =>
            Number(kapal.kapalId ?? kapal.id) === kapalIdNum
              ? { ...kapal, listPersiapan: savedList, checklistStates: savedChecklistStates, checklistDates: savedChecklistDates }
              : kapal
          );

        setKapalMasukList(updateVessel);
        setPersiapanList(updateVessel);
        setBerlayarList(updateVessel);
        await loadData();
        setShowKebutuhanModal(false);
        setSelectedKapalForKebutuhan(null);
        setNewKebutuhan('');
      } else {
        alert(response.message || 'Gagal tambah kebutuhan');
      }
    } catch (e) {
      console.error('Error adding kebutuhan:', e);
      alert('Gagal tambah kebutuhan: ' + (e.message || 'Unknown error'));
    }
  }, [
    kapalMasukList,
    kapalList,
    token,
    newKebutuhan,
    selectedKapalForKebutuhan,
    kebutuhanTargetValid,
    isValidKapalId,
    loadData,
  ]);

  const toStatusText = (kapal) => (kapal?.status || kapal?.statusKerja || '');

  // isBerlayar didefinisikan di bawah (mengacu pada checklist persiapan selesai)

  const isMenepi = (kapal) => {
    const s = toStatusText(kapal).toLowerCase().trim();
    return s.includes('menepi') || s === 'docked';
  };

  const hasSudahBerangkat = (kapal) => !!(kapal?.safeTanggalBerangkat || kapal?.safeTanggalKeberangkatan);

  const isHistory = (kapal) => isMenepi(kapal) && hasSudahBerangkat(kapal);

  // Kapal berlayar = semua persiapan selesai
  const isPersiapanSelesai = (kapal) => {
    const items = kapal?.listPersiapan || [];
    if (!items.length) return false;
    const states = kapal?.checklistStates || {};
    return items.every((item) => !!states?.[item]);
  };

  // Berlayar ditentukan oleh statusKerja/status (bukan infer dari checklist)
  const isBerlayar = (kapal) => {
    const s = toStatusText(kapal).toLowerCase().trim();
    return s.includes('berlayar') || s === 'sailing';
  };


  const [activeTab, setActiveTab] = useState('persiapan'); // 'berlayar' | 'persiapan' | 'history'

  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishKapal, setFinishKapal] = useState(null);
  const [finishTanggalKeberangkatan, setFinishTanggalKeberangkatan] = useState('');

  const isFinishEligible = (kapal) => {
    // Kapal eligible jika persiapan selesai (checklist 100%)
    if (!kapal) return false;
    return isPersiapanSelesai(kapal) && !isHistory(kapal);
  };

  const handleFinishClick = (kapal) => {
    setFinishKapal(kapal);
    setFinishTanggalKeberangkatan('');
    setFinishModalOpen(true);
  };

  const handleFinishConfirm = async () => {
    if (!finishKapal || !finishTanggalKeberangkatan) return;

    try {
      // finishKapal.id pada default biasanya = id kapal_info (bukan id record kapal_masuk)
      const kapalIdNum = Number(finishKapal.kapalId ?? finishKapal.id);
      if (!Number.isFinite(kapalIdNum) || kapalIdNum <= 0) throw new Error('kapalId invalid');

      const response = await kapalMasukAPI.updateByKapalId(token, kapalIdNum, {
        patchFields: {
          tanggalKeberangkatan: finishTanggalKeberangkatan,
          statusKerja: 'berlayar',
        },
      });
      if (!response.success) throw new Error(response.message || 'Update failed');

      setFinishModalOpen(false);
      setFinishKapal(null);
      setFinishTanggalKeberangkatan('');
      await loadData();
      setActiveTab('berlayar');
    } catch (e) {
      console.error('Finish error:', e);
      alert('Gagal finish: ' + (e.message || 'Unknown error'));
    }
  };

  const filteredKapalMasuk = (activeTab === 'persiapan'
    ? persiapanList
    : activeTab === 'berlayar'
      ? berlayarList
      : historyList
  )
    .filter((kapal) => {
      const q = searchTerm.toLowerCase();
      return (
        kapal.nama?.toLowerCase().includes(q) ||
        toStatusText(kapal).toLowerCase().includes(q) ||
        kapal.namaPemilik?.toLowerCase().includes(q)
      );
    });

  // Di Berlayar, item yang sudah tercentang saat Finish tidak boleh diubah.
  const isChecklistItemLocked = (kapal, item) => {
    if (activeTab !== 'berlayar') return false;
    const finished = kapal?.finishedChecklistStates || {};
    const source = Object.keys(finished).length > 0 ? finished : kapal?.checklistStates || {};
    return !!source[item];
  };

  const requestChecklistToggle = (item, kapal) => {
    const kapalId = kapal.kapalId ?? kapal.id;
    if (kapal.checklistStates?.[item]) {
      handleChecklistToggle(item, kapalId);
      return;
    }
    setCheckDateModal({ item, kapalId, date: new Date().toISOString().slice(0, 10) });
  };

  const openDokumenModal = (kapal) => {
    setDokumenForm({ nama: '', tanggalKadaluarsa: '' });
    setDokumenFiles([]);
    setDokumenModal({ kapalId: kapal.kapalId ?? kapal.id, nama: kapal.nama });
  };

  const handleDokumenSubmit = async (e) => {
    e.preventDefault();
    if (!dokumenModal || dokumenSaving) return;
    setDokumenSaving(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://aplikasi-kapal-production.up.railway.app';
      const files = { images: [], pdfs: [] };
      for (const file of dokumenFiles) {
        const uploaded = await uploadAPI.upload(token, file);
        if (!uploaded.success) throw new Error(uploaded.message || `Gagal upload ${file.name}`);
        const url = uploaded.data?.url || `${backendUrl}/uploads/${uploaded.data?.filename}`;
        (file.type.startsWith('image/') ? files.images : files.pdfs).push(url);
      }

      const response = await dokumenPersiapanAPI.create(token, {
        kapalId: Number(dokumenModal.kapalId),
        nama: dokumenForm.nama.trim(),
        tanggalKadaluarsa: dokumenForm.tanggalKadaluarsa,
        filePath: JSON.stringify(files),
      });
      if (!response.success || !response.data) throw new Error(response.message || 'Gagal menyimpan dokumen');

      setDokumenPersiapanList((prev) => [response.data, ...prev]);
      setDokumenModal(null);
    } catch (err) {
      console.error('Add dokumen error:', err);
      alert('Gagal tambah dokumen: ' + (err.message || 'Unknown error'));
    } finally {
      setDokumenSaving(false);
    }
  };

  const handleDeleteDokumenPersiapan = async (dok) => {
    if (!window.confirm(`Hapus dokumen ${dok.nama}?`)) return;
    try {
      const response = await dokumenPersiapanAPI.delete(token, dok.id);
      if (!response.success) throw new Error(response.message || 'Gagal menghapus dokumen');
      setDokumenPersiapanList((prev) => prev.filter((d) => d.id !== dok.id));
    } catch (err) {
      alert('Gagal hapus dokumen: ' + (err.message || 'Unknown error'));
    }
  };

  const getDokumenPersiapanSection = (kapal) => {
    const kapalId = Number(kapal.kapalId ?? kapal.id);
    const docs = dokumenPersiapanList.filter((d) => Number(d.kapalId) === kapalId);
    if (docs.length === 0) return null;
    return (
      <div className="bg-purple-50 p-4 rounded-xl mt-4">
        <h3 className="text-base font-semibold text-gray-800 mb-3">Dokumen Persiapan ({docs.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docs.map((dok) => {
            let files = [];
            try {
              const parsed = JSON.parse(dok.filePath || '{}');
              files = [...(parsed.images || []), ...(parsed.pdfs || [])];
            } catch {
              files = [];
            }
            return (
              <div key={dok.id} className="bg-white p-3 rounded-lg border-l-4 border-purple-400">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{dok.nama}</p>
                    <p className="text-xs text-gray-500">Kadaluarsa: {dok.tanggalKadaluarsa || '-'}</p>
                  </div>
                  <button onClick={() => handleDeleteDokumenPersiapan(dok)} className="text-red-500 text-xs hover:underline">
                    Hapus
                  </button>
                </div>
                {files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((url, i) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        File {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDeleteHistory = async (kapal) => {
    if (!window.confirm(`Hapus history ${kapal.nama}?`)) return;
    try {
      const response = await statusKerjaKapalAPI.deleteHistory(token, kapal.id);
      if (!response.success) throw new Error(response.message || 'Gagal menghapus history');
      await loadData();
    } catch (e) {
      console.error('Delete history error:', e);
      alert('Gagal hapus history: ' + (e.message || 'Unknown error'));
    }
  };

  const handleBerlabuh = async (kapal) => {
    const kapalIdNum = Number(kapal.kapalId ?? kapal.id);
    if (!isValidKapalId(kapalIdNum)) {
      alert('Kapal tidak valid untuk berlabuh');
      return;
    }
    if (!window.confirm(`Kapal ${kapal.nama} berlabuh? Pelayaran akan diselesaikan dan dipindahkan ke History.`)) return;

    try {
      const response = await statusKerjaKapalAPI.berlabuh(token, kapalIdNum, new Date().toISOString().slice(0, 10));
      if (!response.success) throw new Error(response.message || 'Gagal berlabuh');
      await loadData();
      setActiveTab('history');
    } catch (e) {
      console.error('Berlabuh error:', e);
      alert('Gagal berlabuh: ' + (e.message || 'Unknown error'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const isCreating = !editingKapal;
      const payload = {
        ...formData,
        kapalId: parseInt(formData.kapalId),
      };

      const response = editingKapal
        ? await kapalMasukAPI.updateByKapalId(token, payload.kapalId, {
            patchFields: {
              ...(formData.nama?.trim() ? { nama: formData.nama.trim() } : {}),
              ...(formData.tanggalKembali ? { tanggalKembali: formData.tanggalKembali } : {}),
              ...(formData.status?.trim() ? { statusKerja: formData.status.trim() } : {}),
            },
          })
        : await kapalMasukAPI.create(token, payload);

      if (response.success) {
        setShowModal(false);
        setEditingKapal(null);
        setFormData({ kapalId: '', nama: '', tanggalKembali: '', status: '', listPersiapan: [] });
        if (isCreating) setActiveTab('persiapan');
        await loadData();
      } else {
        alert(response.message || 'Gagal menyimpan kapal masuk');
      }
    } catch (e) {
      console.error('Error saving kapal masuk:', e);
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

  const isValidKapaiMasukRecordId = (id) => {
    const n = Number(id);
    return Number.isFinite(n) && n > 0;
  };

  const handleChecklistToggle = useCallback(
    async (item, kapalId, pickedDate) => {
      try {
        const kapalIdNum = Number(kapalId);
        if (!Number.isFinite(kapalIdNum) || kapalIdNum <= 0) {
          throw new Error('kapalId invalid');
        }

        // Di map default dari kapal_info, `id` yang kita simpan biasanya adalah id kapal_info.
        // Namun backend update PUT /api/kapal-masuk/:id membutuhkan id record kapal_masuk.
        // Jadi: cari record kapal_masuk berdasarkan relasi kapalId.
        const recordFromList = kapalMasukList.find((k) => Number(k.kapalId) === kapalIdNum);
        const recordId = recordFromList?.id;

        let kapalRecord = recordFromList;

        // Jika record kapal_masuk belum ada, buat dulu (POST) agar id untuk PUT tersedia.
        if (!kapalRecord || !isValidKapaiMasukRecordId(recordId)) {
          const kapalInfoSource = kapalList.find((k) => Number(k.id) === kapalIdNum);
          if (!kapalInfoSource) throw new Error('kapal info not found');

          const createPayload = {
            kapalId: kapalIdNum,
            nama: kapalInfoSource.nama || '',
            namaPemilik: kapalInfoSource.namaPemilik || '',
            tandaSelar: kapalInfoSource.tandaSelar || '',
            tandaPengenal: kapalInfoSource.tandaPengenal || '',
            beratKotor: kapalInfoSource.beratKotor || '',
            beratBersih: kapalInfoSource.beratBersih || '',
            merekMesin: kapalInfoSource.merekMesin || '',
            nomorSeriMesin: kapalInfoSource.nomorSeriMesin || '',
            jenisAlatTangkap: kapalInfoSource.jenisAlatTangkap || '',
            listPersiapan: kapalInfoSource.listPersiapan || [],
            // status kerja default persiapan
            statusKerja: 'persiapan',
            checklistStates: {},
            checklistDates: {},
            finishedChecklistStates: {},
            isFinished: false,
          };

          const created = await kapalMasukAPI.create(token, createPayload);
          if (!created?.success) throw new Error(created?.message || 'Gagal create kapal-masuk');

          await loadData();
          // Setelah loadData, kita ambil lagi record terbaru
          const refreshed = (Array.isArray(kapalMasukList) ? kapalMasukList : []).find(
            (k) => Number(k.kapalId) === kapalIdNum
          );
          kapalRecord = refreshed || created.data || recordFromList;
        }

        if (!kapalRecord) return;

        const newStates = { ...(kapalRecord.checklistStates || {}), [item]: !(kapalRecord.checklistStates?.[item]) };
        const isChecked = newStates[item];

        const newDates = { ...(kapalRecord.checklistDates || {}) };
        newDates[item] = isChecked ? (pickedDate || new Date().toLocaleDateString('id-ID')) : '';

        const applyChecklist = (states, dates) => (list) =>
          (list || []).map((k) =>
            Number(k.kapalId ?? k.id) === kapalIdNum ? { ...k, checklistStates: states, checklistDates: dates } : k
          );
        const optimistic = applyChecklist(newStates, newDates);
        setKapalMasukList(optimistic);
        setPersiapanList(optimistic);
        setBerlayarList(optimistic);

        const response = await kapalMasukAPI.updateByKapalId(token, kapalIdNum, {
          toggleChecklistItem: item,
          checked: isChecked,
          checkedDate: newDates[item],
        });
        if (!response.success) {
          await loadData();
          throw new Error(response.message || 'Update failed');
        }

        const saved = applyChecklist(
          response.data?.checklistStates || newStates,
          response.data?.checklistDates || newDates
        );
        setKapalMasukList(saved);
        setPersiapanList(saved);
        setBerlayarList(saved);
      } catch (e) {
        console.error('Checklist toggle error:', e);
        loadData();
        alert('Gagal update checklist: ' + (e.message || 'Unknown error'));
      }
    },
    [token, kapalMasukList, kapalList]
  );

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const response = await kapalMasukAPI.delete(token, deleteConfirmId);
      if (response.success) {
        loadData();
      }
    } catch (e) {
      console.error('Error deleting kapal masuk:', e);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
              setFormData({ kapalId: '', nama: '', tanggalKembali: '', status: '', listPersiapan: [] });
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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-4 max-w-7xl">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null);
                loadData();
              }}
              className="ml-4 text-red-700 hover:text-red-900 font-medium"
            >
              Coba lagi
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative flex-1">
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

            {/* Tabs */}
            <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('berlayar')}
                className={`flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                  activeTab === 'berlayar'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                Berlayar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('persiapan')}
                className={`flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                  activeTab === 'persiapan'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                Persiapan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                }`}
              >
                History
              </button>
            </div>
          </div>

          {/* spacer to keep old layout spacing (search icon already moved) */}
          <div className="hidden" />

          {/* Old search icon removed by replacement */}
          
        </div>

        {/* Deprecated: search UI moved to tabs header */}
        {/* Original markup removed */}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        ) : filteredKapalMasuk.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Belum ada kapal masuk</p>
          </div>
        ) : (
          <div className="grid gap-4" key={activeTab}>
            {filteredKapalMasuk.map((kapal, index) => (
              <div key={`${activeTab}-${kapal.id ?? 'x'}-${kapal.kapalId ?? 'x'}-${index}`} className="bg-white rounded-lg shadow hover:shadow-lg transition-all">
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
                          <div
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(kapal.status || kapal.statusKerja).color}`}
                          >
                            {getStatusBadge(kapal.status || kapal.statusKerja).icon}
                            <span className="ml-1">{getStatusBadge(kapal.status || kapal.statusKerja).text}</span>
                          </div>
                          {activeTab === 'persiapan' ? (
                            <p className="text-gray-500">Kembali: {kapal.tanggalKembali || 'Belum ditentukan'}</p>
                          ) : (
                            <>
                              <p className="text-gray-500">Berangkat: {kapal.tanggalKeberangkatan || '-'}</p>
                              {activeTab === 'history' && (
                                <p className="text-gray-500">Berlabuh: {kapal.tanggalKembali || '-'}</p>
                              )}
                              <p className="text-gray-700 font-medium">
                                Durasi berlayar: {hitungDurasiBerlayar(kapal) ?? '-'} hari
                              </p>
                            </>
                          )}
                          <p className="text-gray-500 text-sm">Pemilik: {kapal.namaPemilik || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleViewDetail(kapal)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 text-sm"
                        title="Lihat Detail"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Detail
                      </button>
                      {activeTab !== 'history' && (
                        <>
                          <button
                            onClick={() => handleTambahKebutuhan(kapal.kapalId ?? kapal.id)}
                            disabled={!isValidKapalId(kapal.kapalId ?? kapal.id)}
                            className={`bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-600 ${
                              !isValidKapalId(kapal.kapalId ?? kapal.id) ? 'opacity-50 cursor-not-allowed hover:bg-yellow-500' : ''
                            }`}
                          >
                            + Kebutuhan
                          </button>
                          <button onClick={() => handleEdit(kapal)} className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 text-sm">
                            Edit
                          </button>
                        </>
                      )}
                      {activeTab === 'persiapan' && (
                        <button
                          onClick={() => openDokumenModal(kapal)}
                          disabled={!isValidKapalId(kapal.kapalId ?? kapal.id)}
                          className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
                        >
                          + Dokumen
                        </button>
                      )}
                      {activeTab === 'persiapan' && isFinishEligible(kapal) && (
                        <button
                          onClick={() => handleFinishClick(kapal)}
                          className="bg-emerald-700 text-white px-3 py-2 rounded-lg hover:bg-emerald-800 text-sm"
                          title="Finish persiapan dan tentukan tanggal keberangkatan"
                        >
                          Finish
                        </button>
                      )}
                      {activeTab === 'berlayar' && (
                        <button
                          onClick={() => handleBerlabuh(kapal)}
                          className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm"
                          title="Selesaikan pelayaran dan pindahkan ke History"
                        >
                          Berlabuh
                        </button>
                      )}
                      {activeTab === 'history' && (
                        <button
                          onClick={() => handleDeleteHistory(kapal)}
                          className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                        >
                          Hapus
                        </button>
                      )}
                      {activeTab !== 'history' && (
                        <button onClick={() => handleDelete(kapal.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm">
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {getKebutuhanSection(
                    kapal,
                    true,
                    activeTab === 'history' ? undefined : (item) => requestChecklistToggle(item, kapal),
                    (item) => isChecklistItemLocked(kapal, item)
                  )}
                  {activeTab === 'persiapan' && getDokumenPersiapanSection(kapal)}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">{editingKapal ? 'Edit' : 'Tambah'} Kapal Masuk</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <select
                  value={formData.kapalId}
                  onChange={(e) => setFormData({ ...formData, kapalId: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Pilih Kapal</option>
                  {kapalList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nama khusus"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full p-2 border rounded"
                />
                <input
                  type="date"
                  value={formData.tanggalKembali}
                  onChange={(e) => setFormData({ ...formData, tanggalKembali: e.target.value })}
                  className="w-full p-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2 border rounded"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 p-2 border rounded">
                    Batal
                  </button>
                  <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetailModal && selectedKapalMasuk && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh]">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-semibold text-gray-800">Detail Kapal Masuk: {selectedKapalMasuk.nama}</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 -m-1 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-3">Informasi Kapal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Pemilik Kapal</span>
                      <p className="text-xl font-semibold text-gray-900">{selectedKapalMasuk.namaPemilik || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Tanda Selar</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.tandaSelar || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Tanda Pengenal</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.tandaPengenal || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Berat Kotor</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.beratKotor || '-'} GT</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Berat Bersih</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.beratBersih || '-'} NT</p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-1">
                      <span className="text-sm font-medium text-gray-500 block mb-1">Merek Mesin</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.merekMesin || '-'}</p>
                    </div>
                    <div className="lg:col-span-3">
                      <span className="text-sm font-medium text-gray-500 block mb-1">Jenis Alat Tangkap</span>
                      <p className="font-semibold text-gray-900">{selectedKapalMasuk.jenisAlatTangkap || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 p-6 rounded-xl border-l-4 border-emerald-400">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Status Kerja</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-500 block">Status</span>
                      <p className="text-2xl font-bold text-emerald-700">
                        {selectedKapalMasuk.status || selectedKapalMasuk.statusKerja || 'Persiapan'}
                      </p>
                    </div>
                    {activeTab === 'persiapan' ? (
                      <div>
                        <span className="text-sm text-gray-500 block">Kembali</span>
                        <p className="text-xl font-semibold">{selectedKapalMasuk.tanggalKembali || 'Belum ditentukan'}</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm text-gray-500 block">Berangkat / Berlabuh / Durasi</span>
                        <p className="text-base font-semibold">
                          {selectedKapalMasuk.tanggalKeberangkatan || '-'} / {selectedKapalMasuk.tanggalKembali || '-'} /{' '}
                          {hitungDurasiBerlayar(selectedKapalMasuk) ?? '-'} hari
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-500 block">Persiapan</span>
                      <p className="text-lg font-semibold">{selectedKapalMasuk.listPersiapan?.length || 0} items</p>
                    </div>
                  </div>
                </div>

                {getKebutuhanSection(
                  selectedKapalMasuk,
                  false,
                  activeTab === 'history' ? undefined : (item) => requestChecklistToggle(item, selectedKapalMasuk),
                  (item) => isChecklistItemLocked(selectedKapalMasuk, item)
                )}

                {activeTab !== 'history' && (
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedKapalMasuk);
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    Edit Kapal Masuk
                  </button>
                  <button
                    onClick={() => handleTambahKebutuhan(selectedKapalMasuk.kapalId ?? selectedKapalMasuk.id)}
                    className="flex-1 bg-yellow-500 text-white py-3 px-6 rounded-lg hover:bg-yellow-600 transition-all font-medium flex items-center justify-center gap-2"
                  >
                    + Tambah Kebutuhan
                  </button>
                </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                {(() => {
                  const invalidId = !kebutuhanTargetValid || !isValidKapalId(selectedKapalForKebutuhan?.id);
                  return (
                    <button
                      onClick={() => {
                        const kapalId = selectedKapalForKebutuhan?.id;
                        if (invalidId) {
                          console.warn('[TambahKebutuhan] blocked confirm click. kapalId:', kapalId);
                          return;
                        }
                        handleTambahKebutuhanConfirm();
                      }}
                      disabled={invalidId}
                      className={`flex-1 p-2 rounded ${
                        invalidId
                          ? 'bg-yellow-200 text-yellow-800 cursor-not-allowed'
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                      }`}
                    >
                      Tambah
                    </button>
                  );
                })()}
                <button
                  onClick={() => {
                    setShowKebutuhanModal(false);
                    setSelectedKapalForKebutuhan(null);
                    setNewKebutuhan('');
                    setKebutuhanTargetValid(false);
                  }}
                  className="flex-1 p-2 border rounded"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-xl font-bold text-red-600 mb-2">Hapus?</h2>
              <p className="mb-4">Yakin hapus kapal masuk ini?</p>
              <div className="flex gap-2">
                <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white p-2 rounded">
                  Hapus
                </button>
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 p-2 border rounded">
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {dokumenModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleDokumenSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-1">Tambah Dokumen</h2>
              <p className="text-gray-600 mb-4">{dokumenModal.nama}</p>

              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Dokumen</label>
              <input
                type="text"
                value={dokumenForm.nama}
                onChange={(e) => setDokumenForm({ ...dokumenForm, nama: e.target.value })}
                className="w-full p-2 border rounded mb-4"
                required
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Kadaluarsa</label>
              <div className="mb-4">
                <DatePicker
                  selected={dokumenForm.tanggalKadaluarsa || null}
                  onChange={(date) => setDokumenForm({ ...dokumenForm, tanggalKadaluarsa: date })}
                  placeholderText="Pilih tanggal kadaluarsa"
                />
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">File (gambar atau PDF)</label>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => setDokumenFiles(Array.from(e.target.files || []))}
                className="w-full text-sm mb-1"
              />
              {dokumenFiles.length > 0 && (
                <p className="text-xs text-gray-500 mb-2">{dokumenFiles.length} file dipilih</p>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setDokumenModal(null)}
                  disabled={dokumenSaving}
                  className="flex-1 p-2 border rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={dokumenSaving || !dokumenForm.nama.trim() || !dokumenForm.tanggalKadaluarsa}
                  className="flex-1 bg-purple-600 text-white p-2 rounded disabled:opacity-50"
                >
                  {dokumenSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {checkDateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-xl font-bold mb-2">Tanggal Checklist</h2>
              <p className="text-gray-600 mb-4">{checkDateModal.item}</p>
              <input
                type="date"
                value={checkDateModal.date}
                onChange={(e) => setCheckDateModal({ ...checkDateModal, date: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <div className="flex gap-2 mt-5">
                <button onClick={() => setCheckDateModal(null)} className="flex-1 p-2 border rounded">
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!checkDateModal.date}
                  onClick={() => {
                    const [y, m, d] = checkDateModal.date.split('-');
                    const { item, kapalId } = checkDateModal;
                    setCheckDateModal(null);
                    handleChecklistToggle(item, kapalId, `${d}/${m}/${y}`);
                  }}
                  className="flex-1 bg-emerald-700 text-white p-2 rounded disabled:opacity-50"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {finishModalOpen && finishKapal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
              <h2 className="text-xl font-bold mb-2">Finish Persiapan</h2>
              <p className="text-gray-600 mb-4">
                {finishKapal.nama} - tentukan tanggal keberangkatan.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Keberangkatan</label>
              <input
                type="date"
                value={finishTanggalKeberangkatan}
                onChange={(e) => setFinishTanggalKeberangkatan(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => {
                    setFinishModalOpen(false);
                    setFinishKapal(null);
                    setFinishTanggalKeberangkatan('');
                  }}
                  className="flex-1 p-2 border rounded"
                >
                  Batal
                </button>
                <button
                  onClick={handleFinishConfirm}
                  className="flex-1 bg-emerald-700 text-white p-2 rounded"
                  type="button"
                >
                  Finish
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KapalMasuk;

