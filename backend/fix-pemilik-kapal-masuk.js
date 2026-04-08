const { Pool } = require('pg');
const axios = require('axios');

console.log('🔧 Fix Pemilik Kapal Masuk - Backfill from kapal_info');

const BASE_URL = 'https://aplikasi-kapal-production.up.railway.app';
const KAPAL_DB_URL = process.env.DATABASE_URL_KAPAL || '';
const KAPAL_MASUK_DB_URL = process.env.DATABASE_URL_KAPAL_MASUK || '';

// If local DB env vars available, use direct pools, else use API
async function main() {
  try {
    // Step 1: Get all kapal_masuk
    console.log('1. Fetching kapal_masuk...');
    const masukRes = await axios.get(`${BASE_URL}/api/kapal-masuk`, {
      headers: { Authorization: `Bearer ${process.env.TEST_TOKEN || ''}` }
    });
    const kapalMasukList = masukRes.data.data || [];
    console.log(`📊 Found ${kapalMasukList.length} kapal masuk records`);

    // Step 2: Get all kapal_info
    console.log('2. Fetching kapal_info...');
    const kapalRes = await axios.get(`${BASE_URL}/api/kapal`, {
      headers: { Authorization: `Bearer ${process.env.TEST_TOKEN || ''}` }
    });
    const kapalList = kapalRes.data.data || [];
    console.log(`📋 Found ${kapalList.length} kapal records`);

    let fixes = 0;
    let noMatch = 0;

    for (const masuk of kapalMasukList) {
if (masuk.namaPemilik && masuk.namaPemilik !== '' && masuk.namaPemilik !== '-') {
        console.log(`✅ ${masuk.nama} already has pemilik: ${masuk.namaPemilik}`);
        continue;
      }

      // Find matching kapal by nama
      const matchingKapal = kapalList.find(k => k.nama === masuk.nama);
      if (matchingKapal &amp;&amp; matchingKapal.namaPemilik &amp;&amp; matchingKapal.namaPemilik !== '-') {
        console.log(`🔍 Match found for ${masuk.nama}: ${matchingKapal.namaPemilik}`);
        
        // Update via API
        const updateData = {
          namaPemilik: matchingKapal.namaPemilik,
          tandaSelar: matchingKapal.tandaSelar || masuk.tandaSelar,
          tandaPengenal: matchingKapal.tandaPengenal || masuk.tandaPengenal,
          beratKotor: matchingKapal.beratKotor || masuk.beratKotor,
          beratBersih: matchingKapal.beratBersih || masuk.beratBersih,
          merekMesin: matchingKapal.merekMesin || masuk.merekMesin,
          nomorSeriMesin: matchingKapal.nomorSeriMesin || masuk.nomorSeriMesin,
          jenisAlatTangkap: matchingKapal.jenisAlatTangkap || masuk.jenisAlatTangkap
        };

        try {
          const updateRes = await axios.put(`${BASE_URL}/api/kapal-masuk/${masuk.id}`, updateData, {
            headers: { Authorization: `Bearer ${process.env.TEST_TOKEN || ''}` }
          });
          if (updateRes.data.success) {
            console.log(`✅ FIXED ${masuk.nama} → ${matchingKapal.namaPemilik}`);
            fixes++;
          } else {
            console.log(`❌ Update failed for ${masuk.nama}`);
          }
        } catch (updateErr) {
          console.error(`❌ Update error ${masuk.id}:`, updateErr.response?.data || updateErr.message);
        }
      } else {
        console.log(`❌ No matching kapal or no pemilik for ${masuk.nama}`);
        noMatch++;
      }
    }

    console.log(`\\n🎉 SUMMARY:`);
    console.log(`✅ Fixed: ${fixes}`);
    console.log(`⏭️  Skipped (already had): ${kapalMasukList.length - fixes - noMatch}`);
    console.log(`❌ No match: ${noMatch}`);

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

main();

