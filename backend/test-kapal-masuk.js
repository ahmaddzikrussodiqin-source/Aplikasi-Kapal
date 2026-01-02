// Test script for kapal-masuk endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testKapalMasukAPI() {
    console.log('🧪 Testing Kapal Masuk API...\n');

    try {
        // Test server status
        console.log('1. Testing server status...');
        const response = await axios.get(BASE_URL);
        console.log('✅ Server is running:', response.data);

        // Test register
        console.log('\n2. Testing user registration...');
        const registerResponse = await axios.post(`${BASE_URL}/api/register`, {
            userId: 'testuser',
            password: 'testpass'
        });
        console.log('✅ Register successful:', registerResponse.data);

        // Test login
        console.log('\n3. Testing user login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
            userId: 'testuser',
            password: 'testpass'
        });
        console.log('✅ Login successful:', loginResponse.data);

        const token = loginResponse.data.token;

        // Test create kapal masuk
        console.log('\n4. Testing kapal masuk creation...');
        const kapalMasukData = {
            nama: 'Kapal Test Masuk',
            namaPemilik: 'Pemilik Test',
            tandaSelar: 'TS001',
            tandaPengenal: 'TP001',
            beratKotor: '100',
            beratBersih: '90',
            merekMesin: 'Mesin Test',
            nomorSeriMesin: 'MS001',
            jenisAlatTangkap: 'Jaring',
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

        const createResponse = await axios.post(`${BASE_URL}/api/kapal-masuk`, kapalMasukData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal Masuk created:', createResponse.data);

        const kapalId = createResponse.data.data.id;

        // Test get kapal masuk
        console.log('\n5. Testing get kapal masuk list...');
        const getResponse = await axios.get(`${BASE_URL}/api/kapal-masuk`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal Masuk list retrieved:', JSON.stringify(getResponse.data, null, 2));

        // Test update kapal masuk
        console.log('\n6. Testing kapal masuk update...');
        const updateData = {
            ...kapalMasukData,
            isFinished: true,
            perkiraanKeberangkatan: '3 februari 2026'
        };

        const updateResponse = await axios.put(`${BASE_URL}/api/kapal-masuk/${kapalId}`, updateData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal Masuk updated:', updateResponse.data);

        // Test get kapal masuk again
        console.log('\n7. Testing get kapal masuk list after update...');
        const getAfterUpdateResponse = await axios.get(`${BASE_URL}/api/kapal-masuk`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal Masuk list after update:', JSON.stringify(getAfterUpdateResponse.data, null, 2));

        console.log('\n🎉 Kapal Masuk API tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testKapalMasukAPI();
