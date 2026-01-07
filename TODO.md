# KapalList Project TODO

## Railway Deployment Fix

- [x] Analyze Railway deploy logs error: PostgreSQL authentication failed for dokumen database
- [x] Identify root cause: Dokumen database connection failing prevents app startup
- [x] Implement fix: Make dokumen database connection optional using Promise.allSettled
- [x] Update server.js to handle optional dokumen connection gracefully
- [ ] Test the fix by deploying to Railway
- [ ] Verify app starts successfully without dokumen database

## Dokumen Edit Fix

- [x] Analyze error: column "filePath" of relation "dokumen" does not exist
- [x] Identify root cause: Dokumen table missing filePath column
- [x] Create migration script: backend/migrate-dokumen-filepath.js
- [x] Modify server.js to check and add filePath column on startup
- [ ] Deploy updated server.js to Railway to fix the column issue
- [ ] Test dokumen editing functionality after deployment

## Next Steps

- Deploy the updated code to Railway
- Check if the authentication error is resolved
- Run the dokumen migration script: `node backend/migrate-dokumen-filepath.js`
- Test editing documents in the app
- If dokumen database is needed, ensure correct DATABASE_URL_DOKUMEN is set in Railway variables
