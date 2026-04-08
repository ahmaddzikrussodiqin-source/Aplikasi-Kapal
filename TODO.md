# SyntaxError Fix - Backend server.js
Status: [IN PROGRESS] ✅ PLAN APPROVED

## Breakdown of Approved Plan:
- [✅] 1. Fix syntax in GET /api/kapal-masuk route (convert quoted bracket notation to dot notation for namaPemilik, tandaSelar, etc.)
- [ ] 2. Fix syntax in GET /api/kapal-masuk/:id route (same pattern)
- [✅] 3. Test locally: cd Aplikasi-Kapal/backend && node server.js (no SyntaxError)
- [ ] 4. Test API: curl http://localhost:3000/api/kapal-masuk (with valid auth token)
- [ ] 5. Deploy to Railway
- [ ] 6. Verify Railway deployment successful (no SyntaxError in logs)
- [ ] 7. Mark as ✅ COMPLETED and update TODO_SYNTAX_FIX.md
