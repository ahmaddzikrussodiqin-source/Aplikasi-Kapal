# TODO: Fix Manage Users Issue

## Problem
When pressing "Manage Users", the app fails to load users and shows popup "Gagal memuat users".

## Root Cause Analysis
- API call to GET /api/users fails
- Possible causes: token expired, server error, database not initialized

## Fixes Applied
- [x] Add timeout to ApiClient (30s read/connect)
- [x] Handle 403 error in showManageUsersDialog by logging out user
- [x] Show better error message with response.message()
- [x] Ensure users table exists in backend GET /api/users endpoint

## Testing
- Test Manage Users functionality
- Verify token expiration handling
- Check database initialization

## Next Steps
- Deploy backend changes
- Test on device
- If still fails, check server logs for specific error
