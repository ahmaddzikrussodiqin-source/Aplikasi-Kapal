# TODO List

## Fixed Issues
- [x] **Tanggal Kembali Blank on Edit**: Fixed LocalDateAdapter to handle multiple date formats and simplified date formatting logic in InputActivity.kt
  - Updated LocalDateAdapter to support "yyyy-MM-dd", "d/M/yyyy", "dd/MM/yyyy", and ISO_LOCAL_DATE formats
  - Simplified date display logic in loadKapalDataForEdit function

## Pending Tasks
- [ ] Test the fix by creating and editing kapal masuk data
- [ ] Verify that dates are properly displayed and saved in all scenarios
