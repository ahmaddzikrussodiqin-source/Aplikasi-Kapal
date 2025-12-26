// Simple test script to verify API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🧪 Testing KapalList Backend API...\n');

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

        // Test create kapal
        console.log('\n4. Testing kapal creation...');
        const kapalResponse = await axios.post(`${BASE_URL}/api/kapal`, {
            nama: 'Kapal Test',
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
            listDokumen: [],
            isFinished: 0,
            perkiraanKeberangkatan: '2024-01-02',
            durasiSelesaiPersiapan: '1 hari'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal created:', kapalResponse.data);

        // Test get kapal
        console.log('\n5. Testing get kapal list...');
        const getKapalResponse = await axios.get(`${BASE_URL}/api/kapal`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Kapal list retrieved:', getKapalResponse.data);

        // Test create dokumen
        console.log('\n6. Testing dokumen creation...');
        const dokumenResponse = await axios.post(`${BASE_URL}/api/dokumen`, {
            kapalId: kapalResponse.data.data.id,
            jenis: 'Surat Izin',
            pathGambar: ['image1.jpg', 'image2.jpg'],
            pathPdf: ['document.pdf'],
            tanggalExpired: '2025-01-01'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Dokumen created:', dokumenResponse.data);

        // Test get dokumen
        console.log('\n7. Testing get dokumen list...');
        const getDokumenResponse = await axios.get(`${BASE_URL}/api/dokumen`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Dokumen list retrieved:', getDokumenResponse.data);

        console.log('\n🎉 All tests passed! Backend with separated database tables is ready for deployment.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAPI();
