# TODO: Modify btnEdit in ProfileActivity for finished kapal

## Tasks:
- [x] Modify btnEdit text to "Tambah Kebutuhan" when kapal.isFinished, else "Edit"
- [x] Enable btnEdit always, adjust alpha to 1.0f
- [x] Update onClickListener: if not finished, navigate to InputActivity; if finished, show dialog to add new persiapan item
- [x] In dialog, add new item to kapal.listPersiapan, update via API, reload UI
- [x] Initialize checklistStates and checklistDates for new items added after finish
- [x] Allow checking new items after finish without canceling finish

## Files to edit:
- app/src/main/java/com/example/kapallist/ProfileActivity.kt
