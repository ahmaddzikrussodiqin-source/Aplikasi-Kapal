# TODO - Format Status Kerja Kapal (Website)

## Tujuan
Implementasi alur:
- Persiapan: semua kapal di `kapal_info` yang **belum** berlayar
- Berlayar: kapal sudah `finish` dari persiapan
- Menepi: pindahkan kapal ke **History** (record history terpisah) dan kemudian kapal kembali ke Persiapan
- History: tampilkan kebutuhan, durasi persiapan, durasi berlayar

## Catatan Backend
Backend saat ini hanya mengelola `kapal_masuk_schema.kapal_masuk` untuk checklist & statusKerja.
Belum ada endpoint/struktur untuk *history terpisah*.

## Steps
- [ ] Buat implementasi front-end:
  - [ ] fetch kapal_info (Daftar kapal) sebagai sumber daftar total persiapan+berlayar
  - [ ] fetch kapal_masuk untuk mengetahui status masing-masing kapal
  - [ ] definisikan filter:
    - [ ] Persiapan: ada di kapal_info dan statusKerja != 'berlayar'
    - [ ] Berlayar: statusKerja == 'berlayar'
    - [ ] History: hasil record history terpisah (butuh backend/atau fallback sementara)
  - [ ] tab Persiapan: tombol +Kebutuhan, Edit, Finish
  - [ ] tab Berlayar: tombol +Kebutuhan, Menepi
- [ ] Backend:
  - [ ] tambah tabel/endpoint `kapal_masuk_history` (atau model history terpisah lain)
  - [ ] endpoint POST/PUT untuk transisi:
    - [ ] finish persiapan -> statusKerja berlayar + isi durasi
    - [ ] menepi -> insert record history + reset kapal kembali persiapan
  - [ ] hitung durasi persiapan & durasi berlayar dari tanggal field yang tersedia
- [ ] UI History:
  - [ ] tampilkan kebutuhan (listPersiapan) + durasi persiapan dan durasi berlayar

## Verifikasi
- [ ] Pastikan jumlah kartu pada Persiapan + Berlayar = jumlah kapal pada kapal_info
- [ ] Klik Finish pada Persiapan -> pindah ke Berlayar
- [ ] Klik Menepi pada Berlayar -> muncul di History
- [ ] Setelah menepi -> kapal kembali ke Persiapan (tanpa duplikasi)

