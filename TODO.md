# TODO: Migrate Database to PostgreSQL for Online Connectivity

## Information Gathered
- Backend uses SQLite, which is ephemeral on Railway, causing data loss on redeploy.
- App already uses API for login/register, but users can't login from other devices if data is lost.
- Need persistent database to allow cross-device login with registered userIDs.
- Railway supports PostgreSQL databases for persistence.

## Plan
- Update backend/package.json to include pg dependency.
- Modify backend/server.js to use PostgreSQL instead of SQLite.
- Adjust database initialization and SQL queries for PostgreSQL syntax.
- Update railway.json if needed for database connection.
- Test the changes locally and deploy to Railway.

## Dependent Files to be edited
- [x] backend/package.json: Add pg dependency.
- [x] backend/server.js: Change database driver and queries.
- [ ] railway.json: Ensure deployment config supports PostgreSQL.

## Followup steps
- [x] Install dependencies: npm install.
- [ ] Test locally with PostgreSQL.
- [ ] Deploy to Railway with PostgreSQL database.
- [ ] Verify login works from multiple devices.
