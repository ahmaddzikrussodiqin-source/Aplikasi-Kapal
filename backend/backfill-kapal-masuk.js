const axios = require('axios');

const BASE_URL = 'https://aplikasi-kapal-production.up.railway.app';

async function backfillKapalMasukData() {
  console.log('🔧 Backfilling Kapal Masuk data from kapal_info...\n');

  try {
    // Login (use your credentials)
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      userId: 'Suhanda', // Change to your userId
      password: 'yourpassword' // Change to your password
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Logged in');

    // Get kapal list (source data)
    const kapalRes = await axios.get(`${BASE_URL}/api/kapal`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const kapalMap = new Map(kapalRes.data.data.map(k => [k.nama.toLowerCase(), k]));
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
