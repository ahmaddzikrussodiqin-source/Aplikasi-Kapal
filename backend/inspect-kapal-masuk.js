const axios = require('axios');

const BASE_URL = process.env.RAILWAY_URL || 'http://localhost:3000';

async function inspectKapalMasukData() {
  console.log('🔍 Inspecting Kapal Masuk data...\n');

  try {
    // 1. Try public debug endpoint first (no auth)
    console.log('1. Checking /debug/database (public)...');
    const debugResponse = await axios.get(`${BASE_URL}/debug/database`, { timeout: 10000 });
    console.log('✅ Debug data:');
console.log('Kapal Masuk count:', debugResponse.data.data.kapalMasukCount);
