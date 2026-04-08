# Fix Checklist Reset Bug - Website Version (KapalMasuk.jsx)

**Status:** In Progress  
**Priority:** High  
**Target:** Website (React) - Status Kerja Kapal page

## Problem
When adding/editing requirements (kebutuhan), previously checked checklist items reset/uncheck.

## Root Cause
Stale state closure in `handleTambahKebutuhanConfirm()` - uses outdated `kapalMasukList` state.

## Fix Plan
- [✅] 1. Create TODO.md 
- [✅] 2. Add `useCallback` to `handleTambahKebutuhanConfirm`
- [✅] 3. Fix stale state merging with explicit `?.` fallback  
- [✅] 4. Add optimistic UI update + error rollback
- [✅] 5. Fix syntax errors & duplicate code remnants
- [ ] 6. Test add kebutuhan with existing checked items
- [ ] 7. Test page refresh persistence  
- [ ] 8. Test edit kebutuhan (rename)
- [ ] 9. Verify backend saves correctly
- [ ] 10. Mark complete + attempt_completion

- [ ] 6. Test page refresh persistence  
- [ ] 7. Test edit kebutuhan (rename)
- [ ] 8. Verify backend saves correctly
- [ ] 9. Mark complete + attempt_completion

**Next Step:** Test the fix

## Files
- Primary: `website/src/pages/KapalMasuk.jsx`
- Backend: No changes needed (already correct)

## Test Cases
```
1. Check item A ✓ → Add item B → A remains ✓
2. Check A ✓, B ✓ → Add C → A,B remain ✓ 
3. Page refresh → States persist
4. Edit (rename) B → States preserved
```

