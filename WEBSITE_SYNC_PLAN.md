# RENCANA PENGEMBANGAN WEBSITE - MATCH WITH ANDROID

## Dokumen vs Android Analysis

### 📋 DOKUMEN.JSX - FITUR YANG PERLU DITAMBAH:

1. ✅ Upload file gambar (perlu diimplementasikan)
2. ✅ Upload file PDF (perlu diimplementasikan)
3. ✅ Image preview dengan gallery/viewer
4. ✅ PDF viewer functionality
5. ✅ Multiple file selection
6. ✅ Progress indicator saat upload
7. ✅ Delete file functionality

### 📋 KAPALMASUK.JSX - FITUR YANG PERLU DITAMBAH:

1. ✅ Search/filter by kebutuhan (sudah ada, perlu improvement)
2. ✅ Socket.io integration (sudah ada, perlu dicek)
3. ✅ Delete kapal masuk functionality
4. ✅ Better duration calculations (sudah ada)
5. ✅ Better UI/UX

### 📋 DAFTARKAPAL.JSX - FITUR YANG PERLU DITAMBAH:

1. ✅ Search kapal (sudah ada)
2. ✅ View detail kapal (sudah ada)
3. ✅ Expandable card view (seperti Android)

---

## TODO LIST

### Phase 1: Dokumen.jsx - File Upload & Preview
- [ ] Tambah upload API endpoint
- [ ] Implement file selection (gambar & PDF)
- [ ] Implement upload progress
- [ ] Implement image gallery viewer
- [ ] Implement PDF open functionality
- [ ] Tambah delete file dari dokumen

### Phase 2: KapalMasuk.jsx - Complete Features
- [ ] Tambah delete kapal masuk functionality
- [ ] Improve filter functionality
- [ ] Better socket.io integration
- [ ] Tambah duration calculations yang lebih akurat

### Phase 3: UI/UX Improvements
- [ ] Consistent styling dengan Android
- [ ] Better mobile responsiveness
- [ ] Loading states yang lebih baik
- [ ] Error handling yang lebih baik

---

## Implementation Details

### 1. DOKUMEN.JSX - UPLOAD FEATURE

```javascript
// New state untuk upload
const [uploading, setUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);
const [selectedFiles, setSelectedFiles] = useState([]);

// Upload function
const handleFileUpload = async (files, dokumenId) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  
  return response.json();
};

// Image preview modal dengan ViewPager
const ImageViewerModal = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 text-white">
        ✕
      </button>
      <div className="relative w-full h-full">
        <img 
          src={images[currentIndex]} 
          className="max-h-screen object-contain"
        />
        {images.length > 1 && (
          <>
            <button 
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              className="absolute left-4 top-1/2 text-white text-2xl"
            >
              ←
            </button>
            <button 
              onClick={() => setCurrentIndex(i => Math.min(images.length - 1, i + 1))}
              className="absolute right-4 top-1/2 text-white text-2xl"
            >
              →
            </button>
            <div className="absolute bottom-4 left-1/2 text-white">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

### 2. KAPALMASUK.JSX - DELETE FEATURE

```javascript
// Delete kapal masuk
const handleDelete = async (id) => {
  if (window.confirm('Apakah Anda yakin ingin menghapus kapal masuk ini?')) {
    try {
      const response = await kapalMasukAPI.delete(token, id);
      if (response.success) {
        loadKapalMasukList();
        Toast.success('Kapal masuk berhasil dihapus');
      }
    } catch (error) {
      Toast.error('Gagal menghapus kapal masuk');
    }
  }
};
```

### 3. API ENDPOINTS YANG DIBUTUHKAN

```javascript
// File Upload API (sudah ada di backend)
export const uploadAPI = {
  upload: async (token, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    
    return response.json();
  },
  
  uploadSingle: async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    
    return response.json();
  }
};
```

---

## File yang Perlu Diubah:

1. `website/src/pages/Dokumen.jsx` - Tambah upload & preview features
2. `website/src/pages/KapalMasuk.jsx` - Tambah delete & improve features
3. `website/src/services/api.js` - Tambah upload endpoints
4. `website/src/components/ImageViewer.jsx` - Komponen baru untuk preview gambar
5. `website/src/components/FileUploader.jsx` - Komponen baru untuk upload

---

## Estimasi Waktu Pengembangan:

- Phase 1 (Dokumen Upload): 2-3 jam
- Phase 2 (KapalMasuk): 1-2 jam
- Phase 3 (UI/UX): 1-2 jam

**Total: 4-7 jam**

