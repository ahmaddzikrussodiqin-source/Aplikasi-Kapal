# TODO - Fix Persiapan Edit Issue

## Completed Tasks
- [x] Analyze the issue: Editing persiapan always creates new entry instead of updating existing one
- [x] Identify root cause: InputActivity.kt always calls createKapalMasuk API even in edit mode
- [x] Fix the logic: Modify btnSimpan.setOnClickListener to check editMode and call appropriate API (update vs create)
- [x] Update InputActivity.kt to use updateKapalMasuk when in edit mode

## Summary
The issue was in the InputActivity.kt file where the save button always created a new KapalMasukEntity with id=0 and called the createKapalMasuk API, even when editing an existing entry. The fix adds a conditional check: if in edit mode, it uses the existing selectedKapalId and calls updateKapalMasuk API instead.

## Testing Required
- [ ] Test creating new kapal masuk (should work as before)
- [ ] Test editing existing kapal masuk persiapan (should update instead of create new)
- [ ] Verify backend updateKapalMasuk endpoint works correctly
