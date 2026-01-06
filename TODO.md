# TODO: Fix UI Update Issue in DocumentActivity

## Problem
- Tanggal (date), gambar (images), and PDF pada UI tidak ter update after editing documents.
- Logs show API updates successfully, but RecyclerView doesn't refresh.

## Root Cause
- setupDokumenAdapter creates a new DokumenAdapter each time and sets it to RecyclerView.
- Although setting a new adapter should rebind views, in practice, it may not refresh existing views properly.
- Reusing the same adapter instance and calling notifyDataSetChanged ensures views are updated.

## Plan
- Modify setupDokumenAdapter to reuse currentDokumenAdapter if exists, else create new.
- Use updateList to update data and notify changes.
- Remove unnecessary rvKapalList.invalidate().

## Steps
1. Update setupDokumenAdapter in DocumentActivity.kt to reuse adapter.
2. Test the fix by running the app and editing a document.
3. Verify that date, image count, and PDF count update in the list after save.

## Files to Edit
- app/src/main/java/com/example/kapallist/DocumentActivity.kt
