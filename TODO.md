# TODO: Separate Database Tables for Kapal, Dokumen, and Kapal Masuk

## Information Gathered
- Current KapalEntity has listDokumen as List<DokumenKapal>, stored as JSON.
- DokumenKapal has jenis, pathGambar (MutableList<String>), pathPdf (MutableList<String>), tanggalExpired.
- Kapal masuk: ships with tanggalKembali not null.
- Goal: Separate tables to avoid cloning data.

## Plan
- Create DokumenEntity with foreign key to kapal_id.
- Modify KapalEntity to remove listDokumen.
- Create KapalMasukEntity for returned ships.
- Update KapalDatabase with new entities and migrations.
- Create DokumenDao and KapalMasukDao.
- Update Converters for JSON lists.

## Steps
- [ ] Create DokumenEntity.kt
- [ ] Create KapalMasukEntity.kt
- [ ] Modify KapalEntity.kt (remove listDokumen)
- [ ] Create DokumenDao.kt
- [ ] Create KapalMasukDao.kt
- [ ] Update KapalDatabase.kt (add entities, version, migrations)
- [ ] Update Converters.kt if needed
- [ ] Test database changes
- [ ] Update activities to use new structure
