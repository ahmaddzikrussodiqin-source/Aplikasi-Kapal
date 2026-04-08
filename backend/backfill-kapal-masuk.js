const axios = require('axios');

const BASE_URL = 'https://aplikasi-kapal-production.up.railway.app';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJTdWhhbmRhIiwibmFtYSI6IlN1aGFuZGEiLCJpYXQiOjE3NzU2MzQxMTYsImV4cCI6MTc3NTcyMDUxNn0.-EsqgW5wz8ImmsMWQSK2UeaOaQcW6Ds7vC3CsZNeGTs';

async function backfillKapalMasukData() {
  console.log('🔧 Backfilling kapal masuk data...\n');

  try {
    // Get kapal source
    const kapalRes = await axios.get(`${BASE_URL}/api/kapal`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const kapalMap = new Map(kapalRes.data.data.map(k => [k.nama.trim().toLowerCase(), k]));
    console.log(`📊 ${kapalMap.size} kapal records`);

    // Get kapal masuk
    const masukRes = await axios.get(`${BASE_URL}/api/kapal-masuk`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log(`📊 Loaded ${kapalMap.size} kapal records`);

    // Get kapal masuk list
    const masukRes = await axios.get(`${BASE_URL}/api/kapal-masuk`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const masukList = masukRes.data.data;
    console.log(`📊 ${masukList.length} kapal masuk records`);

    let updatedCount = 0;

    for (const km of masukList) {
      if (km.namaPemilik === '' || km.namaPemilik === null) {
        const match = kapalMap.get((km.nama || '').toLowerCase());
        if (match) {
          // Backfill from matching kapal
          const updatedKm = {
            ...km,
            namaPemilik: match.namaPemilik || 'Pemilik Kapal',
            tandaSelar: match.tandaSelar || '',
            tandaPengenal
