# TODO: Change Date Fields to LocalDate Type

## Database Schema Changes
- [ ] Update backend/server.js: Change tanggalKembali and perkiraanKeberangkatan columns from TEXT to DATE in kapal_masuk_schema.kapal_masuk table

## Android App Changes
- [ ] Update KapalMasukEntity.kt: Change tanggalKembali and perkiraanKeberangkatan from String? to LocalDate?
- [ ] Update Converters.kt: Add LocalDate type converters for Room database

## Testing
- [ ] Test database schema changes
- [ ] Test Android app compilation
- [ ] Test data migration if needed
