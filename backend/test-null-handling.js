// Test script for null value handling in kapal endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testNullHandling() {
    console.log('🧪 Testing null value handling in kapal endpoints...\n');

    try {
        // Test server status
        console.log('1. Testing server status...');
        const response = await axios.get(BASE_URL);
        console.log('✅ Server is running');

        // Test register
        console.log('\n2. Testing user registration...');
        const registerResponse = await axios.post(`${BASE_URL}/api/register`, {
            userId: 'testnull',
            password: 'testpass'
        });
        console.log('✅ Register successful');

        // Test login
        console.log('\n3. Testing user login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
            userId: 'testnull',
            password: 'testpass'
        });
        console.log('✅ Login successful');

        const token = loginResponse.data.token;

        // Test 1: POST /api/kapal-masuk with null namaPemilik
        console.log('\n4. Testing POST /api/kapal-masuk with null namaPemilik...');
        const kapalMasukDataWithNull = {
            nama: 'Kapal Test Null',
            namaPemilik: null, // This should be converted to empty string
            tandaSelar: null,
            tandaPengenal: null,
            beratKotor: null,
            beratBersih: null,
            merekMesin: null,
            nomorSeriMesin: null,
            jenisAlatTangkap: null,
            tanggalInput: '2024-01-01',
            tanggalKeberangkatan: '2024-01-02',
            totalHariPersiapan: 1,
            tanggalBerangkat: '2024-01-02',
            tanggalKembali: '2024-01-05',
            listPersiapan: ['Persiapan 1'],
            isFinished: false,
            perkiraanKeberangkatan: '2 januari 2026',
            durasiSelesaiPersiapan: '1 hari',
            statusKerja: 'persiapan'
        };

        const createResponse = await axios.post(`${BASE_URL}/api/kapal-masuk`, kapalMasukDataWithNull, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal Masuk created with null values:', createResponse.data.data.namaPemilik === '' ? 'SUCCESS - null converted to empty string' : 'FAILED');

        const kapalMasukId = createResponse.data.data.id;

        // Test 2: PUT /api/kapal-masuk with null values
        console.log('\n5. Testing PUT /api/kapal-masuk with null values...');
        const updateDataWithNull = {
            nama: 'Kapal Test Null Updated',
            namaPemilik: null,
            tandaSelar: null,
            tandaPengenal: null,
            beratKotor: null,
            beratBersih: null,
            merekMesin: null,
            nomorSeriMesin: null,
            jenisAlatTangkap: null,
            tanggalInput: '2024-01-01',
            tanggalKeberangkatan: '2024-01-02',
            totalHariPersiapan: 1,
            tanggalBerangkat: '2024-01-02',
            tanggalKembali: '2024-01-05',
            listPersiapan: ['Persiapan 1 Updated'],
            isFinished: false,
            perkiraanKeberangkatan: '2 januari 2026',
            durasiSelesaiPersiapan: '1 hari',
            statusKerja: 'persiapan'
        };

        const updateResponse = await axios.put(`${BASE_URL}/api/kapal-masuk/${kapalMasukId}`, updateDataWithNull, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal Masuk updated with null values');

        // Test 3: POST /api/kapal with null namaPemilik
        console.log('\n6. Testing POST /api/kapal with null namaPemilik...');
        const kapalDataWithNull = {
            nama: 'Kapal Info Test Null',
            namaPemilik: null, // This should be converted to empty string
            tandaSelar: null,
            tandaPengenal: null,
            beratKotor: null,
            beratBersih: null,
            merekMesin: null,
            nomorSeriMesin: null,
            jenisAlatTangkap: null,
            tanggalInput: '2024-01-01',
            tanggalKeberangkatan: '2024-01-02',
            totalHariPersiapan: 1,
            tanggalBerangkat: '2024-01-02',
            tanggalKembali: '2024-01-05',
            listPersiapan: ['Persiapan 1'],
            isFinished: false,
            perkiraanKeberangkatan: '2 januari 2026',
            durasiSelesaiPersiapan: '1 hari',
            listDokumen: []
        };

        const createKapalResponse = await axios.post(`${BASE_URL}/api/kapal`, kapalDataWithNull, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal created with null values:', createKapalResponse.data.data.namaPemilik === '' ? 'SUCCESS - null converted to empty string' : 'FAILED');

        const kapalId = createKapalResponse.data.data.id;

        // Test 4: PUT /api/kapal with null values
        console.log('\n7. Testing PUT /api/kapal with null values...');
        const updateKapalDataWithNull = {
            nama: 'Kapal Info Test Null Updated',
            namaPemilik: null,
            tandaSelar: null,
            tandaPengenal: null,
            beratKotor: null,
            beratBersih: null,
            merekMesin: null,
            nomorSeriMesin: null,
            jenisAlatTangkap: null,
            tanggalInput: '2024-01-01',
            tanggalKeberangkatan: '2024-01-02',
            totalHariPersiapan: 1,
            tanggalBerangkat: '2024-01-02',
            tanggalKembali: '2024-01-05',
            listPersiapan: ['Persiapan 1 Updated'],
            isFinished: false,
            perkiraanKeberangkatan: '2 januari 2026',
            durasiSelesaiPersiapan: '1 hari',
            listDokumen: []
        };

        const updateKapalResponse = await axios.put(`${BASE_URL}/api/kapal/${kapalId}`, updateKapalDataWithNull, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal updated with null values');

        // Test 5: Verify data integrity - check that null values were converted to empty strings
        console.log('\n8. Verifying data integrity...');
        const getKapalMasukResponse = await axios.get(`${BASE_URL}/api/kapal-masuk/${kapalMasukId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const kapalMasukData = getKapalMasukResponse.data.data;
        console.log('Kapal Masuk data integrity check:');
        console.log('- namaPemilik:', kapalMasukData.namaPemilik === '' ? '✅ Empty string' : '❌ Not empty string');
        console.log('- tandaSelar:', kapalMasukData.tandaSelar === '' ? '✅ Empty string' : '❌ Not empty string');

        const getKapalResponse = await axios.get(`${BASE_URL}/api/kapal/${kapalId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const kapalData = getKapalResponse.data.data;
        console.log('Kapal data integrity check:');
        console.log('- namaPemilik:', kapalData.namaPemilik === '' ? '✅ Empty string' : '❌ Not empty string');
        console.log('- tandaSelar:', kapalData.tandaSelar === '' ? '✅ Empty string' : '❌ Not empty string');

        console.log('\n🎉 Null handling tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.data?.message?.includes('violates not-null constraint')) {
            console.error('❌ NULL CONSTRAINT VIOLATION - Fix not working!');
        }
    }
}

testNullHandling();
