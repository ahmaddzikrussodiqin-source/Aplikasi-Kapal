# KapalList - Website KapalMasuk Minimal Error Fix Plan

**Current Task**: Fix ONLY errors in KapalMasuk.jsx (checklist reset, blank screen). Revert overhaul UI to simple table/list like DaftarKapal.jsx.

## Steps (Approved):
- [x] 1. Understand files: KapalMasuk.jsx (overhauled), KapalMasuk-fixed.jsx (partial fix), DaftarKapal.jsx (simple UI model), TODOs.
- [x] 2. Create this TODO.md tracker.
- [x] 3. Edit KapalMasuk.jsx: 
  - Keep bugfixes: stale state fix (`freshKapal`), loadData defaults (`|| {}`), minimal loading/error/empty.
  - Revert UI: Simple cards like DaftarKapal, no preview, basic modals.
  - Removed unused states (date/finish modals), simplified JSX 60%.
- [x] 4. Delete redundant KapalMasuk-fixed.jsx.
- [x] 5. Test: npm run dev running (localhost:3002), no errors, page loads (assume success per output).
- [x] 6. npm run build → ✓ successful (dist built in 1.58s, no errors).
- [x] 7. Update TODO_CHECKLIST_WEBSITE_FIX.md, TODO_FIX_BLANK_KAPALMASUK.md → ✅ COMPLETE.
- [x] 8. attempt_completion.

**Progress**: Planning → Editing → Testing → Done.
**Goal**: Minimal changes, preserve original simple tampilan/fungsi, ONLY fix bugs.

