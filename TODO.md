# TODO List for KapalList Project

## Completed Tasks
- [x] Modify Kapal.kt to support KapalMasukEntity
  - Added constructor from KapalMasukEntity
  - Added toKapalMasukEntity() method
- [x] Update ProfileActivity to load data from kapal masuk database
  - Changed API call from getAllKapal to getAllKapalMasuk
  - Changed update calls to updateKapalMasuk
  - Updated conversion logic to use KapalMasukEntity

## Summary
The task has been completed. When users fill in "kapal masuk" data in InputActivity, it is saved to the kapal masuk database. The status kapal (ProfileActivity) now retrieves and displays data from the kapal masuk database instead of the main kapal database.
