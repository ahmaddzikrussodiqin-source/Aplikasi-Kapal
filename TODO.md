# TODO: Separate Database for Kapal and Status Kerja Kapal

## Backend Changes (Railway Online Database)
- [ ] Update backend/server.js to create separate tables: kapal_info and kapal_status
- [ ] Modify kapal API routes to handle separated data structure
- [ ] Add foreign key relationship between kapal_status and kapal_info
- [ ] Update database initialization for new schema
- [ ] Test Railway deployment with new database structure

## Android Room Database Changes
- [ ] Create KapalInfoEntity.kt with basic ship information fields
- [ ] Create KapalStatusEntity.kt with work status fields
- [ ] Update KapalDatabase.kt to include new entities
- [ ] Create KapalInfoDao.kt for ship info operations
- [ ] Create KapalStatusDao.kt for status operations
- [ ] Update existing KapalDao.kt or create new DAOs

## Android App Updates
- [ ] Update Kapal.kt data class to handle separated structure
- [ ] Modify activities to work with separated entities
- [ ] Update adapters to display separated data
- [ ] Handle data migration from old combined structure to new separated structure

## Testing and Deployment
- [ ] Test local database changes
- [ ] Test API integration with separated backend
- [ ] Deploy backend to Railway with new schema
- [ ] Test full application with online database
