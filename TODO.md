# TODO: Simplify Kapal Masuk Database Schema

## Overview
Modify DATABASE_URL_KAPAL_MASUK to only include Nama Kapal, Tanggal Kembali, and Persiapan from Kapal Masuk input.

## Tasks
- [ ] Update KapalMasukEntity.kt to only include required fields (id, nama, tanggalKembali, listPersiapan)
- [ ] Modify backend/server.js table creation for kapal_masuk
- [ ] Update API endpoints in server.js to handle simplified schema
- [ ] Update ApiService.kt interface if needed
- [ ] Test the changes to ensure functionality works
- [ ] Create migration script if needed for existing data
