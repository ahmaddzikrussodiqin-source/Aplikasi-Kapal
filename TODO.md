# TODO List for Fixing Checklist Confirmation Dialog Loop

- [x] Add `isProgrammaticChange` boolean flag to ProfileActivity class
- [x] Modify `setOnCheckedChangeListener` to return early if `isProgrammaticChange` is true
- [x] Wrap checkbox state changes in "Batal" buttons with the flag to prevent listener trigger
- [x] Test the checklist functionality to ensure canceling works without additional dialogs
