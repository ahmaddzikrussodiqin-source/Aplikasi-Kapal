const axios = require('axios');

const BASE_URL = process.env.RAILWAY_URL || 'https://aplikasi-kapal-production.up.railway.app';

async function inspectKapalMasukData() {
  console.log('🔍 Inspecting Kapal Masuk data on', BASE_URL, '\\n');

  try {
    // 1. Public debug endpoint
    console.log('1. Public /debug/database...');
    const debugResponse = await axios.get(`${BASE_URL}/debug/database`, { timeout: 10000 });
    console.log('Kapal Masuk count:', debugResponse.data.data.kapalMasukCount || 0);
    console.log('Sample names:', debugResponse.data.data.kapalMasuk || 'none');

    // 2. Login for full data
    console.log('\\n2. Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
      userId: 'admin', // Use your userId
      password: 'admin' // Use your password
    });
    const token = loginResponse.data.data.token;
    console.log('✅ Logged in');

    // 3. Get all kapal masuk
    console.log('\\n3. GET /api/kapal-masuk...');
    const getResponse = await axios.get(`${BASE_URL}/api/kapal-masuk`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = getResponse.data.data;
    console.log(`📊 ${data.length} records`);

    data.forEach((kapal, index) => {
      if (index < 10) { // First 10
        console.log(`\\n--- Kapal ${kapal.id}: ${kapal.nama || 'Unnamed'} ---`);
        console.log('Pemilik:', kapal.namaPemilik || 'MISSING');
        console.log('Tanggal Kembali:', kapal.tanggalKembali || 'MISSING');
        console.log('Perkiraan Keberangkatan:', kapal.perkiraanKeberangkatan || 'MISSING');
        console.log('Kebutuhan (listPersiapan count):', (kapal.listPersiapan || []).length);
        console.log('isFinished:', kapal.isFinished);
      }
    });

    if (data.length === 0) console.log('No data - empty table');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

inspectKapalMasukData();

