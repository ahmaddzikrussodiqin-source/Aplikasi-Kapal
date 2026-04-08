# TODO_SYNTAX_FIX - KapalMasuk.jsx Build Error Fix

## Status: 🔄 In Progress

### Steps:
- [ ] 1. Replace all `&amp;&amp;` → `&&` in KapalMasuk.jsx (8+ locations)
- [ ] 2. Test: `cd Aplikasi-Kapal/website && npm run build`
- [ ] 3. Test Docker build
- [ ] 4. Deploy & verify

## Changes Planned:
1. `{error &amp;&amp; (` → `{error && (`
2. `{showModal &amp;&amp; (` → `{showModal && (`
3. `{showDetailModal &amp;&amp; selectedKapalMasuk &amp;&amp; (` → `{showDetailModal && selectedKapalMasuk && (`
4. `(selectedKapalMasuk.listPersiapan?.length || 0) > 0 &amp;&amp; (` → `> 0 && (`
5. `{selectedKapalMasuk.checklistDates?.[item] &amp;&amp; (` → `{selectedKapalMasuk.checklistDates?.[item] && (`
6. `{selectedKapalMasuk.listPersiapan?.length > 10 &amp;&amp; (` → `> 10 && (`
7. `{showKebutuhanModal &amp;&amp; (` → `{showKebutuhanModal && (`
8. `{deleteConfirmId &amp;&amp; (` → `{deleteConfirmId && (`

**Current file:** `/Users/diki/KapalList/Aplikasi-Kapal/website/src/pages/KapalMasuk.jsx`

