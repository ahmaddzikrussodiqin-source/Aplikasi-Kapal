# TODO - Status Kerja Kapal (Website) - Tab Berlayar / Persiapan / History

- [ ] Analisis KapalMasuk.jsx untuk menentukan titik pemfilteran data dan lokasi UI list
- [ ] Tambah state `activeTab` (berlayar/persiapan/history) dan UI tab selector
- [ ] Buat fungsi `isBerlayar`, `isPersiapan`, `isHistory` berdasarkan status yang sudah ada di UI saat ini
- [ ] Gabungkan dengan searchTerm: hasil list = filteredKapalMasuk (search) + filter tab
- [ ] Pastikan semua modal (tambah/edit/detail/kebutuhan/delete) tetap bekerja saat pindah tab
- [ ] Jalankan `npm run build` (atau `npm run dev` bila perlu) untuk verifikasi tidak ada error

