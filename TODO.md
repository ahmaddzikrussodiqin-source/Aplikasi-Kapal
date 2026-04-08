# TODO: Hilangkan Informasi Kapal kecuali Nama Pemilik di Status Kerja Kapal

**Status**: Planning complete, implementation in progress  
**Target**: Android ProfileActivity + dialogs, Website KapalMasuk - show ONLY nama kapal + nama pemilik + status/dates/checklist  

## Steps to Complete:
- [x] 1. Understand files via search_files/read_file  
- [x] 2. Create detailed edit plan & get user approval  
- [x] 3. Create this TODO.md  
- [ ] 4. Read KapalMasukAdapter.kt  
- [ ] 5. Edit dialog_view_kapal.xml (remove ship details TextViews except owner/status)  
- [ ] 6. Edit ProfileActivity.kt (remove setText for removed fields)  
- [ ] 7. Edit item_kapal_masuk.xml (hide tv_nama_kapal, promote owner)  
- [ ] 8. Edit KapalMasuk.jsx (remove detail grids/modals ship specs)  
- [ ] 9. Edit KapalMasukAdapter.kt if binds extra fields  
- [ ] 10. Test Android: Run app → ProfileActivity → tap item → dialog shows only name/owner/status  
- [ ] 11. Test Website: `cd Aplikasi-Kapal/website && npm run dev` → /kapal-masuk → cards/modals clean  
- [ ] 12. Update TODO.md → attempt_completion  

**Notes**: User confirmed "ya, hanya informasi nama kapal dan pemilik kapal" → Keep nama + namaPemilik, remove all other ship specs (tanda selar, berat, mesin, alat tangkap).

