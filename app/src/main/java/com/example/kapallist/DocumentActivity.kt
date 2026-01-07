package com.example.kapallist

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.floatingactionbutton.FloatingActionButton
import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import java.io.File
import java.io.FileOutputStream
import java.io.IOException



class DocumentActivity : AppCompatActivity() {

    companion object {
        const val REQUEST_CODE_PICK_FILE = 1001
    }

    private lateinit var kapalAdapter: DocumentKapalAdapter
    private var listKapal = mutableListOf<KapalEntity>()
    private lateinit var database: KapalDatabase

    private var currentKapalPosition: Int = -1
    private var currentDokumenPosition: Int = -1

    private var currentDokumenAdapter: DokumenAdapter? = null
    private lateinit var rvKapalList: RecyclerView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var btnBack: FloatingActionButton
    private lateinit var btnAddDokumen: FloatingActionButton

    private var currentKapal: KapalEntity? = null
    private var listDokumen = mutableListOf<DokumenEntity>()
    private var showingShipList = true
    private var pendingGambarAdditions = mutableListOf<String>()
    private var pendingPdfAdditions = mutableListOf<String>()

    private var currentTvGambarList: TextView? = null
    private var currentTvPdfList: TextView? = null
    private var currentPendingGambarDeletions = mutableListOf<Int>()
    private var currentPendingPdfDeletions = mutableListOf<Int>()
    private var currentDokumen: DokumenKapal? = null
    private var savedKapalId: Int = -1
    private var isConfigChange: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_document)

        if (ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_MEDIA_IMAGES
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.READ_MEDIA_IMAGES),
                1
            )
        }

        rvKapalList = findViewById(R.id.rv_kapal_list)
        swipeRefreshLayout = findViewById(R.id.swipe_refresh_layout)
        btnBack = findViewById(R.id.btn_back)
        btnAddDokumen = findViewById(R.id.btn_add_dokumen)
        btnBack.setOnClickListener { finish() }
        btnAddDokumen.setOnClickListener {
            if (currentKapal != null) {
                showTambahDokumenDialog()
            }
        }

        swipeRefreshLayout.setOnRefreshListener {
            refreshData()
        }

        kapalAdapter = DocumentKapalAdapter(listKapal) { kapal ->
            showDocumentList(kapal)
        }

        rvKapalList.layoutManager = LinearLayoutManager(this)
        rvKapalList.adapter = kapalAdapter
        rvKapalList.addItemDecoration(DividerItemDecoration(this, LinearLayoutManager.VERTICAL))

        isConfigChange = savedInstanceState != null
        val sharedPref = getSharedPreferences("document_prefs", MODE_PRIVATE)
        savedKapalId = savedInstanceState?.getInt("currentKapalId", -1) ?: sharedPref.getInt("currentKapalId", -1)
    }

    override fun onResume() {
        super.onResume()
        val sharedPref = getSharedPreferences("document_prefs", MODE_PRIVATE)
        savedKapalId = sharedPref.getInt("currentKapalId", -1)
        loadKapalList()
        // Reload documents if we're currently viewing a ship's documents
        currentKapal?.let { loadDokumenForKapal(it.id) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        currentKapal?.id?.let {
            outState.putInt("currentKapalId", it)
            val sharedPref = getSharedPreferences("document_prefs", MODE_PRIVATE)
            sharedPref.edit().putInt("currentKapalId", it).apply()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
    }

    private fun loadKapalList() {
        lifecycleScope.launch {
            try {
                val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                val token = sharedPref.getString("token", "") ?: ""
                if (token.isEmpty()) {
                    Toast.makeText(this@DocumentActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                    return@launch
                }

                val response = ApiClient.apiService.getAllKapal("Bearer $token")
                if (response.isSuccessful) {
                    val apiResponse = response.body()
                    if (apiResponse?.success == true) {
                        val kapalEntities = apiResponse.data ?: emptyList()
                        listKapal.clear()
                        listKapal.addAll(kapalEntities)
                        kapalAdapter.notifyDataSetChanged()

                        if (isConfigChange && savedKapalId != -1 && currentKapal == null) {
                            val kapal = listKapal.find { it.id == savedKapalId }
                            if (kapal != null) {
                                showDocumentList(kapal)
                            }
                        }
                    } else {
                        Toast.makeText(this@DocumentActivity, "Gagal memuat data kapal", Toast.LENGTH_LONG).show()
                    }
                } else {
                    Toast.makeText(this@DocumentActivity, "Gagal memuat data kapal: ${response.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@DocumentActivity, "Gagal memuat data", Toast.LENGTH_LONG).show()
                Log.e("DocumentActivity", "Load kapal error: ${e.message}")
            } finally {
                Log.d("DocumentActivity", "Setting isRefreshing to false")
                swipeRefreshLayout.isRefreshing = false
            }
        }
    }

    private fun refreshData() {
        loadKapalList()
        currentKapal?.let { loadDokumenForKapal(it.id) }
    }

    fun setCurrentDokumenPosition(position: Int) {
        currentDokumenPosition = position
    }

    // Fungsi untuk menampilkan dialog detail kapal (hanya lihat dan hapus)
    private fun showDetailKapalDialog(kapal: KapalEntity) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_detail_kapal, null)
        val tvNamaPemilik = dialogView.findViewById<TextView>(R.id.tv_nama_pemilik)
        val tvTandaSelar = dialogView.findViewById<TextView>(R.id.tv_tanda_selar)
        val tvTandaPengenal = dialogView.findViewById<TextView>(R.id.tv_tanda_pengenal)
        val tvBeratKotor = dialogView.findViewById<TextView>(R.id.tv_berat_kotor)
        val tvBeratBersih = dialogView.findViewById<TextView>(R.id.tv_berat_bersih)
        val tvMerekMesin = dialogView.findViewById<TextView>(R.id.tv_merek_mesin)
        val tvNomorSeriMesin = dialogView.findViewById<TextView>(R.id.tv_nomor_seri_mesin)
        val tvJenisAlatTangkap = dialogView.findViewById<TextView>(R.id.tv_jenis_alat_tangkap)
        // Isi data kapal ke TextView (sesuaikan dengan data KapalEntity)
        tvNamaPemilik.text = "Nama Pemilik: ${kapal.nama ?: "Tidak ada"}"
        tvTandaSelar.text = "Tanda Selar: ${kapal.tanggalInput ?: "Tidak ada"}"  // Sesuaikan field jika berbeda
        tvTandaPengenal.text = "Tanda Pengenal: ${kapal.tanggalKeberangkatan ?: "Tidak ada"}"
        tvBeratKotor.text = "Berat Kotor: ${kapal.totalHariPersiapan ?: "Tidak ada"}"
        tvBeratBersih.text = "Berat Bersih: ${kapal.tanggalBerangkat ?: "Tidak ada"}"
        tvMerekMesin.text = "Merek Mesin: ${kapal.tanggalKembali ?: "Tidak ada"}"
        tvNomorSeriMesin.text = "Nomor Seri Mesin: ${kapal.listPersiapan.size}"  // Contoh, sesuaikan
        tvJenisAlatTangkap.text = "Jenis Alat Tangkap: ${kapal.listDokumen.size}"  // Contoh, sesuaikan

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(false)
            .create()

        dialog.show()
    }

    private fun showTambahDokumenDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_tambah_dokumen, null)
        val etJenisDokumen = dialogView.findViewById<android.widget.EditText>(R.id.et_jenis_dokumen_dialog)
        val etTanggalExpired = dialogView.findViewById<android.widget.EditText>(R.id.et_tanggal_expired_dialog)
        val btnSimpanDokumen = dialogView.findViewById<Button>(R.id.btn_simpan_dokumen)

        etTanggalExpired.setOnClickListener {
            val c = java.util.Calendar.getInstance()
            val dpd = android.app.DatePickerDialog(this, { _, y, m, d -> etTanggalExpired.setText("$d/${m + 1}/$y") }, c.get(java.util.Calendar.YEAR), c.get(java.util.Calendar.MONTH), c.get(java.util.Calendar.DAY_OF_MONTH))
            dpd.show()
        }
        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        btnSimpanDokumen.setOnClickListener {
            val jenis = etJenisDokumen.text.toString()
            val tanggalExpired = etTanggalExpired.text.toString()
            if (jenis.isNotEmpty() && currentKapal != null) {
                // For new documents, filePath can be empty or null
                val newDokumen = DokumenEntity(
                    kapalId = currentKapal!!.id,
                    nama = jenis, // Use jenis as nama for now
                    jenis = jenis,
                    tanggalKadaluarsa = tanggalExpired,
                    status = "aktif",
                    filePath = null // New documents start with no files
                )

                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@DocumentActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        val response = ApiClient.apiService.createDokumen("Bearer $token", newDokumen)
                        if (response.isSuccessful) {
                            val apiResponse = response.body()
                            if (apiResponse?.success == true) {
                                Toast.makeText(this@DocumentActivity, "Dokumen berhasil ditambahkan", Toast.LENGTH_SHORT).show()
                                // Reload documents from API to reflect changes
                                currentKapal?.id?.let { loadDokumenForKapal(it) }
                                dialog.dismiss()
                            } else {
                                Toast.makeText(this@DocumentActivity, "Gagal menambah dokumen", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(this@DocumentActivity, "Gagal menambah dokumen: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@DocumentActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                        Log.e("DocumentActivity", "Create dokumen error: ${e.message}")
                    }
                }
            } else {
                Toast.makeText(this, "Jenis dokumen harus diisi", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_PICK_FILE && resultCode == Activity.RESULT_OK) {
            val uris = mutableListOf<Uri>()
            data?.clipData?.let { clipData ->
                for (i in 0 until clipData.itemCount) {
                    clipData.getItemAt(i).uri?.let { uris.add(it) }
                }
            } ?: data?.data?.let { uris.add(it) }

            lifecycleScope.launch {
                uris.forEach { uri ->
                    val mimeType = contentResolver.getType(uri) ?: ""
                    val fileUrl = uploadFileToServer(uri, mimeType)
                    if (fileUrl != null) {
                        if (mimeType.startsWith("image")) {
                            pendingGambarAdditions.add(fileUrl)
                            Log.d("DocumentActivity", "Added to pendingGambarAdditions: $fileUrl")
                        } else if (mimeType.contains("pdf")) {
                            pendingPdfAdditions.add(fileUrl)
                            Log.d("DocumentActivity", "Added to pendingPdfAdditions: $fileUrl")
                        } else {
                            Toast.makeText(this@DocumentActivity, "File tipe ini tidak didukung", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(this@DocumentActivity, "Gagal upload file", Toast.LENGTH_SHORT).show()
                    }
                }
                // Update the counts in the dialog
                updateFileCounts()
                // Note: No database update here - changes only happen on save
                currentDokumenPosition = -1
            }
        }
    }

    private suspend fun uploadFileToServer(uri: Uri, mimeType: String): String? {
        return try {
            val inputStream = contentResolver.openInputStream(uri) ?: return null
            val extension = when {
                mimeType.contains("pdf") -> ".pdf"
                mimeType.startsWith("image") -> ".jpg"
                else -> ""
            }
            val fileName = "file_${System.currentTimeMillis()}$extension"

            // Create MultipartBody.Part
            val requestBody = okhttp3.RequestBody.create(
                mimeType.toMediaTypeOrNull(),
                inputStream.readBytes()
            )
            val filePart = okhttp3.MultipartBody.Part.createFormData("file", fileName, requestBody)

            // Upload to server
            val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
            val token = sharedPref.getString("token", "") ?: return null

            Log.d("DocumentActivity", "Uploading file: $fileName, mimeType: $mimeType")
            val response = ApiClient.apiService.uploadFile("Bearer $token", filePart)
            Log.d("DocumentActivity", "Upload response code: ${response.code()}, message: ${response.message()}")
            if (response.isSuccessful) {
                val apiResponse = response.body()
                Log.d("DocumentActivity", "Upload API response: $apiResponse")
                if (apiResponse?.success == true) {
                    val filename = apiResponse.data?.filename
                    if (filename != null) {
                        val fileUrl = "${Config.BASE_URL}/uploads/$filename"
                        Log.d("DocumentActivity", "Upload successful, URL: $fileUrl")
                        return fileUrl
                    }
                }
            }
            Log.e("DocumentActivity", "Upload failed: ${response.message()}")
            null
        } catch (e: Exception) {
            Log.e("DocumentActivity", "Error upload file: ${e.message}")
            null
        }
    }

    private fun showDocumentList(kapal: KapalEntity) {
        currentKapal = kapal
        val sharedPref = getSharedPreferences("document_prefs", MODE_PRIVATE)
        sharedPref.edit().putInt("currentKapalId", kapal.id).apply()
        showingShipList = false
        loadDokumenForKapal(kapal.id)
        btnBack.setOnClickListener {
            showShipList()
        }
        btnAddDokumen.visibility = View.VISIBLE
    }

    private fun loadDokumenForKapal(kapalId: Int) {
        lifecycleScope.launch {
            loadFromApi(kapalId)
        }
    }

    private suspend fun loadFromApi(kapalId: Int) {
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val token = sharedPref.getString("token", "") ?: ""
        if (token.isEmpty()) {
            Toast.makeText(this@DocumentActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
            // Even if token is empty, switch to document view with empty list
            listDokumen.clear()
            setupDokumenAdapter()
            return
        }

        Log.d("DocumentActivity", "Fetching dokumen for kapalId: $kapalId")
        val response = ApiClient.apiService.getDokumenByKapalId("Bearer $token", kapalId)
        Log.d("DocumentActivity", "Response code: ${response.code()}, message: ${response.message()}")
        if (response.isSuccessful) {
            val apiResponse = response.body()
            Log.d("DocumentActivity", "API Response: success=${apiResponse?.success}, message=${apiResponse?.message}, data size=${apiResponse?.data?.size}")
            if (apiResponse?.success == true) {
                val dokumenForKapal = apiResponse.data ?: emptyList()
                Log.d("DocumentActivity", "Dokumen count: ${dokumenForKapal.size}")
                dokumenForKapal.forEachIndexed { index, dokumen ->
                    Log.d("DocumentActivity", "Dokumen $index: id=${dokumen.id}, jenis=${dokumen.jenis}, filePath=${dokumen.filePath}")
                }
                listDokumen.clear()
                listDokumen.addAll(dokumenForKapal)
                setupDokumenAdapter()
            } else {
                Toast.makeText(this@DocumentActivity, "Gagal memuat data dokumen: ${apiResponse?.message}", Toast.LENGTH_LONG).show()
                // Switch to document view with empty list
                listDokumen.clear()
                setupDokumenAdapter()
            }
        } else {
            Toast.makeText(this@DocumentActivity, "Gagal memuat data dokumen: ${response.message()}", Toast.LENGTH_LONG).show()
            // Switch to document view with empty list
            listDokumen.clear()
            setupDokumenAdapter()
        }
    }



    private fun setupDokumenAdapter() {
        val dokumenKapalList = listDokumen.map { dokumenEntity ->
            // Parse file paths from JSON
            val pathGambar = mutableListOf<String>()
            val pathPdf = mutableListOf<String>()

            dokumenEntity.filePath?.let { filePathJson ->
                Log.d("DocumentActivity", "Parsing filePathJson: $filePathJson")
                try {
                    val jsonObject = JSONObject(filePathJson)
                    val imagesArray = jsonObject.getJSONArray("images")
                    for (i in 0 until imagesArray.length()) {
                        pathGambar.add(imagesArray.getString(i))
                    }
                    val pdfsArray = jsonObject.getJSONArray("pdfs")
                    for (i in 0 until pdfsArray.length()) {
                        pathPdf.add(pdfsArray.getString(i))
                    }
                    Log.d("DocumentActivity", "Parsed pathGambar size: ${pathGambar.size}, pathPdf size: ${pathPdf.size}")
                } catch (e: Exception) {
                    Log.e("DocumentActivity", "Error parsing file paths: ${e.message}, json: $filePathJson")
                }
            }

            // Convert DokumenEntity to DokumenKapal for adapter
            DokumenKapal(
                jenis = dokumenEntity.jenis ?: "",
                pathGambar = pathGambar,
                pathPdf = pathPdf,
                tanggalExpired = dokumenEntity.tanggalKadaluarsa ?: ""
            )
        }.toMutableList()

        Log.d("DocumentActivity", "Setting up DokumenAdapter with ${dokumenKapalList.size} items")
        dokumenKapalList.forEachIndexed { index, dokumenKapal ->
            Log.d("DocumentActivity", "Item $index: jenis=${dokumenKapal.jenis}, gambar=${dokumenKapal.pathGambar.size}, pdf=${dokumenKapal.pathPdf.size}")
        }

        if (currentDokumenAdapter == null) {
            currentDokumenAdapter = DokumenAdapter(
                dokumenKapalList,
                onImagePreviewClick = { position ->
                    val dokumenKapal = currentDokumenAdapter?.getItem(position)
                    if (dokumenKapal?.pathGambar?.isNotEmpty() == true) {
                        showImagePreviewDialog(dokumenKapal.pathGambar)
                    } else {
                        Toast.makeText(this, "Tidak ada gambar untuk ditampilkan", Toast.LENGTH_SHORT).show()
                    }
                },
                onPdfPreviewClick = { position ->
                    val dokumenKapal = currentDokumenAdapter?.getItem(position)
                    if (dokumenKapal?.pathPdf?.isNotEmpty() == true) {
                        if (dokumenKapal.pathPdf.size == 1) {
                            openPdf(dokumenKapal.pathPdf[0])
                        } else {
                            showPdfSelectionDialog(dokumenKapal.pathPdf)
                        }
                    } else {
                        Toast.makeText(this, "Tidak ada PDF untuk ditampilkan", Toast.LENGTH_SHORT).show()
                    }
                },
                onEditClick = { position ->
                    showEditDokumenDialog(listDokumen[position])
                }
            )
            rvKapalList.adapter = currentDokumenAdapter
        } else {
            currentDokumenAdapter?.updateList(dokumenKapalList)
        }
        Log.d("DocumentActivity", "Adapter updated")
    }

    private fun showShipList() {
        currentKapal = null
        showingShipList = true
        rvKapalList.adapter = kapalAdapter
        btnBack.setOnClickListener { finish() }
        btnAddDokumen.visibility = View.GONE
    }

    private fun showImagePreviewDialog(images: List<String>) {
        if (images.isEmpty()) {
            Toast.makeText(this, "Tidak ada gambar untuk ditampilkan", Toast.LENGTH_SHORT).show()
            return
        }

        val dialogView = layoutInflater.inflate(R.layout.dialog_image_viewer, null)
        val viewPager: androidx.viewpager2.widget.ViewPager2 = dialogView.findViewById(R.id.view_pager)

        val imagePagerAdapter = ImagePagerAdapter(this, images.toMutableList())
        viewPager.adapter = imagePagerAdapter

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setPositiveButton("Tutup", null)
            .create()

        dialog.show()
    }

    private fun openPdf(pdfPath: String) {
        if (pdfPath.startsWith("http")) {
            // Open URL in browser
            val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(pdfPath))
            try {
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Tidak ada aplikasi untuk membuka PDF", Toast.LENGTH_SHORT).show()
            }
        } else {
            val file = File(pdfPath)
            if (file.exists()) {
                val uri = androidx.core.content.FileProvider.getUriForFile(
                    this,
                    "${packageName}.provider",
                    file
                )
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/pdf")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                try {
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Tidak ada aplikasi untuk membuka PDF", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(this, "File PDF tidak ditemukan", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showPdfSelectionDialog(pdfPaths: List<String>) {
        if (pdfPaths.isEmpty()) {
            Toast.makeText(this, "Tidak ada PDF untuk ditampilkan", Toast.LENGTH_SHORT).show()
            return
        }

        val pdfNames = pdfPaths.map { path ->
            if (path.startsWith("http")) {
                // Extract filename from URL
                path.substringAfterLast('/')
            } else {
                File(path).name
            }
        }
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Pilih PDF")
        builder.setItems(pdfNames.toTypedArray()) { _, which ->
            openPdf(pdfPaths[which])
        }
        builder.setNegativeButton("Batal", null)
        builder.show()
    }

    private fun showEditDokumenDialog(dokumenEntity: DokumenEntity) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_edit_dokumen, null)
        val etJenisDokumen = dialogView.findViewById<android.widget.EditText>(R.id.et_jenis_edit)
        val etTanggalExpired = dialogView.findViewById<android.widget.EditText>(R.id.et_tanggal_expired_edit)
        val btnTambahGambar = dialogView.findViewById<Button>(R.id.btn_tambah_gambar_edit)
        val btnTambahPdf = dialogView.findViewById<Button>(R.id.btn_tambah_pdf_edit)
        val tvGambarList = dialogView.findViewById<TextView>(R.id.tv_gambar_list)
        val tvPdfList = dialogView.findViewById<TextView>(R.id.tv_pdf_list)
        val btnSimpanDokumen = dialogView.findViewById<Button>(R.id.btn_simpan_edit)
        val btnBatal = dialogView.findViewById<Button>(R.id.btn_batal_edit)

        etJenisDokumen.setText(dokumenEntity.jenis)
        etTanggalExpired.setText(dokumenEntity.tanggalKadaluarsa)

        // Initialize pending changes
        pendingGambarAdditions.clear()
        pendingPdfAdditions.clear()
        currentPendingGambarDeletions.clear()
        currentPendingPdfDeletions.clear()

        // Parse existing file paths
        val existingPathGambar = mutableListOf<String>()
        val existingPathPdf = mutableListOf<String>()

        dokumenEntity.filePath?.let { filePathJson ->
            try {
                val jsonObject = JSONObject(filePathJson)
                val imagesArray = jsonObject.getJSONArray("images")
                for (i in 0 until imagesArray.length()) {
                    existingPathGambar.add(imagesArray.getString(i))
                }
                val pdfsArray = jsonObject.getJSONArray("pdfs")
                for (i in 0 until pdfsArray.length()) {
                    existingPathPdf.add(pdfsArray.getString(i))
                }
            } catch (e: Exception) {
                Log.e("DocumentActivity", "Error parsing existing file paths: ${e.message}, json: $filePathJson")
            }
        }

        // Set current references
        currentTvGambarList = tvGambarList
        currentTvPdfList = tvPdfList
        // Convert DokumenEntity to DokumenKapal for compatibility
        currentDokumen = DokumenKapal(
            jenis = dokumenEntity.jenis ?: "",
            pathGambar = existingPathGambar,
            pathPdf = existingPathPdf,
            tanggalExpired = dokumenEntity.tanggalKadaluarsa ?: ""
        )

        // Show original counts initially
        updateFileCounts()

        etTanggalExpired.setOnClickListener {
            val c = java.util.Calendar.getInstance()
            val dpd = android.app.DatePickerDialog(this, { _, y, m, d -> etTanggalExpired.setText("$d/${m + 1}/$y") }, c.get(java.util.Calendar.YEAR), c.get(java.util.Calendar.MONTH), c.get(java.util.Calendar.DAY_OF_MONTH))
            dpd.show()
        }

        btnTambahGambar.setOnClickListener {
            pickFile("image/*")
        }

        btnTambahPdf.setOnClickListener {
            pickFile("application/pdf")
        }

        tvGambarList.setOnClickListener {
            showDeleteFileDialog(existingPathGambar, "Gambar", 0, null, currentPendingGambarDeletions) {
                updateFileCounts()
            }
        }

        tvPdfList.setOnClickListener {
            showDeleteFileDialog(existingPathPdf, "PDF", 0, null, currentPendingPdfDeletions) {
                updateFileCounts()
            }
        }

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(false)
            .create()

        btnSimpanDokumen.setOnClickListener {
            val jenis = etJenisDokumen.text.toString()
            val tanggalExpired = etTanggalExpired.text.toString()
            if (jenis.isNotEmpty()) {
                // Merge existing files with new additions, excluding deleted ones
                val allImages = existingPathGambar.filterIndexed { index, _ -> index !in currentPendingGambarDeletions } + pendingGambarAdditions
                val allPdfs = existingPathPdf.filterIndexed { index, _ -> index !in currentPendingPdfDeletions } + pendingPdfAdditions

                Log.d("DocumentActivity", "existingPathGambar: $existingPathGambar")
                Log.d("DocumentActivity", "pendingGambarAdditions: $pendingGambarAdditions")
                Log.d("DocumentActivity", "currentPendingGambarDeletions: $currentPendingGambarDeletions")
                Log.d("DocumentActivity", "allImages: $allImages")
                Log.d("DocumentActivity", "existingPathPdf: $existingPathPdf")
                Log.d("DocumentActivity", "pendingPdfAdditions: $pendingPdfAdditions")
                Log.d("DocumentActivity", "currentPendingPdfDeletions: $currentPendingPdfDeletions")
                Log.d("DocumentActivity", "allPdfs: $allPdfs")

                // Serialize file paths as JSON for storage
                val jsonObject = JSONObject()
                jsonObject.put("images", JSONArray(allImages))
                jsonObject.put("pdfs", JSONArray(allPdfs))
                val filePathJson = jsonObject.toString()
                Log.d("DocumentActivity", "Saving filePathJson: $filePathJson")

                val updatedDokumen = dokumenEntity.copy(
                    kapalId = dokumenEntity.kapalId ?: currentKapal?.id,
                    nama = jenis,
                    jenis = jenis,
                    tanggalKadaluarsa = tanggalExpired,
                    filePath = filePathJson
                    // tanggalTerbit is preserved from the original dokumenEntity
                )

                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@DocumentActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        val response = ApiClient.apiService.updateDokumen("Bearer $token", dokumenEntity.id, updatedDokumen)
                        if (response.isSuccessful) {
                            val apiResponse = response.body()
                            if (apiResponse?.success == true) {
                                Toast.makeText(this@DocumentActivity, "Dokumen berhasil diperbarui", Toast.LENGTH_SHORT).show()
                                // Clear pending changes
                                pendingGambarAdditions.clear()
                                pendingPdfAdditions.clear()
                                currentPendingGambarDeletions.clear()
                                currentPendingPdfDeletions.clear()
                                // Reload documents from API to reflect changes
                                currentKapal?.id?.let { loadDokumenForKapal(it) }
                                dialog.dismiss()
                            } else {
                                Toast.makeText(this@DocumentActivity, "Gagal memperbarui dokumen", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(this@DocumentActivity, "Gagal memperbarui dokumen: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@DocumentActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                        Log.e("DocumentActivity", "Update dokumen error: ${e.message}")
                    }
                }
            } else {
                Toast.makeText(this, "Jenis dokumen harus diisi", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    private fun showDeleteFileDialog(
        fileList: MutableList<String>,
        fileType: String,
        dokumenPosition: Int,
        dokumenAdapter: DokumenAdapter? = null,
        pendingDeletions: MutableList<Int>,
        onFileDeleted: (() -> Unit)? = null
    ) {
        if (fileList.isEmpty()) {
            Toast.makeText(this, "Tidak ada $fileType untuk dihapus", Toast.LENGTH_SHORT).show()
            return
        }

        val fileNames = fileList.map { File(it).name }
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Hapus $fileType")
        builder.setItems(fileNames.toTypedArray()) { _, which ->
            // Mark for deletion instead of immediately removing
            if (!pendingDeletions.contains(which)) {
                pendingDeletions.add(which)
            }
            Toast.makeText(this, "$fileType akan dihapus saat menyimpan", Toast.LENGTH_SHORT).show()
        }
        builder.setNegativeButton("Batal", null)
        builder.show()
    }

    private fun pickFile(mimeType: String) {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = mimeType
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        }
        startActivityForResult(intent, REQUEST_CODE_PICK_FILE)
    }

    private fun updateFileCounts() {
        currentDokumen?.let { dokumen ->
            val gambarCount = dokumen.pathGambar.size - currentPendingGambarDeletions.size + pendingGambarAdditions.size
            val pdfCount = dokumen.pathPdf.size - currentPendingPdfDeletions.size + pendingPdfAdditions.size
            currentTvGambarList?.text = "Lihat Gambar: $gambarCount"
            currentTvPdfList?.text = "Lihat PDF: $pdfCount"
        }
    }
}
