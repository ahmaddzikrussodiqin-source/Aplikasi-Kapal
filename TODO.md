# Database Connection Fix for Railway Deployment

## Current Issue
- Railway deployment fails with PostgreSQL connection timeout (ETIMEDOUT 10.163.10.137:5432)
- Application tries to connect to multiple database pools but Railway provides single database
- Connection fails during startup, preventing app from running

## Plan
- [ ] Simplify database setup to use single PostgreSQL database with schemas
- [ ] Update server.js to use one pool instead of four separate pools
- [ ] Add connection timeout and retry logic for better reliability
- [ ] Update all database queries to use schema-qualified table names
- [ ] Add better error handling and logging
- [ ] Update README.md with correct deployment instructions
- [ ] Test the changes locally before deployment

## Implementation Steps
1. Modify server.js database configuration
2. Update all pool references to use single pool
3. Add connection retry logic
4. Update schema creation and table queries
5. Test database operations
6. Update documentation
