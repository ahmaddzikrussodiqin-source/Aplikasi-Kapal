# TODO: Fix Ship Duplication Issue

## Problem
When completing ship status by selecting an existing ship (e.g., Kapal A) in InputActivity, duplicates appear in the ship list because the system always creates a new ship instead of updating the existing one.

## Solution
Modify InputActivity.kt to check if a ship is selected (selectedKapalId != null). If selected, update the existing ship; otherwise, create a new one.

## Tasks
- [ ] Edit InputActivity.kt btnSimpan.setOnClickListener to conditionally call createKapal or updateKapal based on selectedKapalId
- [ ] Test the fix: Select existing ship, ensure no duplicate; Create new ship, ensure it works

## Files to Edit
- app/src/main/java/com/example/kapallist/InputActivity.kt
