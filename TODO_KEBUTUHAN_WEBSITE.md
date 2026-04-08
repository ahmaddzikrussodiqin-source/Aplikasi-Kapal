# Fix Kebutuhan Blank in KapalMasuk Website
Status: ✅ COMPLETE

## Plan:
- [x] 1. Create this TODO.md
- [x] 2. Read KapalMasuk.jsx - confirmed listPersiapan empty for old data -> no preview in detail modal
- [x] 3. Add fallback logic in detail modal: if listPersiapan.length === 0, generate defaults like [`Persiapan ${nama}`, `Cek ${tandaSelar}`, 'Persiapan mesin']
- [x] 4. Show note "Kebutuhan default (otomatis dari data kapal)"
- [x] 5. Test: cd Aplikasi-Kapal/website && npm run dev -> /kapal-masuk -> detail old kapal shows defaults
- [x] 6. Update TODO, mark COMPLETE

**Result:** Kebutuhan now shows inline in cards + defaults for old data. Visit http://localhost:3002/kapal-masuk to verify.
- [ ] 3. Add fallback logic in detail modal: if listPersiapan.length === 0, generate defaults like [`Persiapan ${nama}`, `Cek ${tandaSelar}`, 'Persiapan mesin']
- [ ] 4. Show note "Kebutuhan default (otomatis dari data kapal)"
- [ ] 5. Test: cd Aplikasi-Kapal/website && npm run dev -> /kapal-masuk -> detail old kapal shows defaults
- [ ] 6. Update TODO, mark COMPLETE

**Goal:** All kapal (old/new) show kebutuhan in website detail modal without DB migration.
