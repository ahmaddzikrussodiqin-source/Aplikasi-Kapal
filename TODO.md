# TODO

## Current Task: Fix DocumentActivity state preservation

- [x] Add savedKapalId variable
- [x] Implement onSaveInstanceState to save currentKapal.id
- [x] Restore savedKapalId in onCreate
- [x] In loadKapalList success, if savedKapalId != -1, showDocumentList for that kapal
- [x] Test the fix
