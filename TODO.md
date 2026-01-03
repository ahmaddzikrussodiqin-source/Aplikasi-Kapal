# Migration to Railway Schema-based Database

## Current Status
- Using separate PostgreSQL databases for each module
- DATABASE_URL_USERS, DATABASE_URL_KAPAL, DATABASE_URL_DOKUMEN, DATABASE_URL_KAPAL_MASUK
- Each database has its own pool connection

## Target
- Single Railway database with schemas
- Single DATABASE_URL environment variable
- Tables organized in schemas: users_schema, kapal_schema, dokumen_schema, kapal_masuk_schema

## Tasks
- [ ] Update database initialization in server.js to create schemas and tables
- [ ] Migrate users routes to use users_schema
- [ ] Migrate kapal routes to use kapal_schema
- [ ] Migrate dokumen routes to use dokumen_schema
- [ ] Migrate kapal-masuk routes to use kapal_masuk_schema
- [ ] Remove separate pool connections, keep only dbPool
- [ ] Update setup-railway-env.sh for single DATABASE_URL
- [ ] Test all API endpoints work correctly
