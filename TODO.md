- [x] **Handle data migration** from old combined structure to new separated structure
=======
- [x] **Handle data migration** from old combined structure to new separated structure
  - [x] Created KapalDatabase migration from version 2 to 3
  - [x] Added KapalInfoDao and KapalStatusDao for separated operations
  - [x] Implemented KapalStatusWithInfo data class for joined queries
  - [x] Migration preserves existing data by splitting KapalEntity into KapalInfoEntity and KapalStatusEntity
