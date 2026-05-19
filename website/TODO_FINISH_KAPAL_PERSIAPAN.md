# TODO_FINISH_KAPAL_PERSIAPAN.md

- [x] Tambah state modal finish: `finishModalOpen`, `finishKapal`, `finishTanggalKeberangkatan`
- [x] Buat helper `isFinishEligible(kapal)` (hanya kapal persiapan yang checklist persiapan selesai)
- [x] Tambahkan tombol **Finish** pada card kapal saat eligible (hanya di tab `persiapan`)
- [x] Saat klik **Finish**: buka modal, tampilkan input date untuk `tanggalKeberangkatan`
- [x] Saat submit modal: update kapal-masuk via `kapalMasukAPI.update` dengan payload `tanggalKeberangkatan` dan `statusKerja='berlayar'`
- [x] Setelah sukses: close modal + `loadData()` + set `activeTab='berlayar'`
- [x] Jalankan `npm run build` pada folder website untuk cek error


