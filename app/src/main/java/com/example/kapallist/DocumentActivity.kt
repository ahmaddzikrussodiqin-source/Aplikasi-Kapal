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
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import com.example.kapallist.ApiClient
import com.example.kapallist.ApiService

class DocumentActivity : AppCompatActivity() {

    companion object {
        const val REQUEST_CODE_PICK_FILE = 1001
    }

    private fun getToken(): String {
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        return sharedPref.getString("token", "") ?: ""
    }

    private lateinit var kapalAdapter: DocumentKapalAdapter
    private var listKapal = mutableListOf<KapalEntity>()
    private lateinit var database: DocumentDatabase
    private lateinit var apiService: ApiService

    private var currentKapalPosition: Int = -1
    private var currentDokumenPosition: Int = -1

    private var currentDokumenAdapter: DokumenAdapter? = null
    private lateinit var rvKapalList: RecyclerView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var btnBack: FloatingActionButton
    private lateinit var btnAddDokumen: FloatingActionButton
    private lateinit var btnAddKapal: FloatingActionButton

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

        database = DocumentDatabase.getDatabase(this)
        apiService = ApiClient.apiService

        rvKapalList = findViewById(R.id.rv_kapal_list)
        swipeRefreshLayout = findViewById(R.id.swipe_refresh_layout)
        btnBack = findViewById(R.id.btn_back)
        btnAddDokumen = findViewById(R.id.btn_add_dokumen)
        btnAddKapal = findViewById(R.id.btn_add_kapal)
        btnBack.setOnClickListener { finish() }
        btnAddDokumen.setOnClickListener {
            if (currentKapal != null) {
                showTambahDokumenDialog()
            }
        }
        btnAddKapal.setOnClickListener {
            showTambahKapalDialog()
        }

        swipeRefreshLayout.setOnRefreshListener {
            // No refresh since manual
            swipeRefreshLayout.isRefreshing = false
        }

        kapalAdapter = DocumentKapalAdapter(listKapal) { kapal ->
            showDocumentList(kapal)
        }

        rvKapalList.layoutManager = LinearLayoutManager(this)
        rvKapalList.adapter = kapalAdapter
        rvKapalList.addItemDecoration(DividerItemDecoration(this, LinearLayoutManager.VERTICAL))

        // Start with ship list, btnAddKapal visible
        showShipList()
    }

    override fun onResume() {
        super.onResume()
        loadKapalList()
    }

    override fun onDestroy() {
        super.onDestroy()
    }

    private fun loadKapalList() {
        lifecycleScope.launch {
            listKapal.clear()
            listKapal.addAll(database.kapalDao().getAllKapal())
            kapalAdapter.notifyDataSetChanged()
        }
    }

    private fun showTambahKapalDialog() {
        val editText = android.widget.EditText(this)
        editText.hint = "Nama Kapal"

        val dialog = AlertDialog.Builder(this)
            .setTitle("Tambah Kapal Baru")
            .setView(editText)
            .setPositiveButton("Tambah") { _, _ ->
                val nama = editText.text.toString()
                if (nama.isNotEmpty()) {
                    createKapal(nama)
                } else {
                    Toast.makeText(this, "Nama kapal harus diisi", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Batal", null)
            .create()

        dialog.show()
    }

    private fun createKapal(nama: String) {
        lifecycleScope.launch {
            val newKapal = KapalEntity(nama = nama)
            database.kapalDao().insertKapal(newKapal)
            listKapal.add(newKapal)
            kapalAdapter.notifyDataSetChanged()
            Toast.makeText(this@DocumentActivity, "Kapal berhasil ditambahkan", Toast.LENGTH_SHORT).show()
        }
    }

    fun setCurrentDokumenPosition(position: Int) {
        currentDokumenPosition = position
    }

    private fun showDocumentList(kapal: KapalEntity) {
        currentKapal = kapal
        showingShipList = false
        loadDokumenForKapal(kapal.id)
        btnBack.setOnClickListener {
            showShipList()
        }
        btnAddKapal.visibility = View.GONE
        btnAddDokumen.visibility = View.VISIBLE
    }

    private fun loadDokumenForKapal(kapalId: Int) {
        val token = getToken()
        if (token.isNotEmpty()) {
            lifecycleScope.launch {
                try {
                    val response = apiService.getDokumenByKapalId("Bearer $token", kapalId)
                    if (response.isSuccessful && response.body()?.data?.isNotEmpty() == true) {
                        val apiDokumen = response.body()?.data ?: emptyList()
                        // Save to local DB for cache
                        database.dokumenDao().deleteAllDokumen() // Clear local dokumen
                        apiDokumen.forEach { database.dokumenDao().insertDokumen(it) }
                        listDokumen.clear()
                        listDokumen.addAll(apiDokumen)
                        setupDokumenAdapter()
                    } else {
                        // Fallback to local
                        loadFromLocal(kapalId)
                    }
                } catch (e: Exception) {
                    // Fallback to local
                    loadFromLocal(kapalId)
                }
            }
        } else {
            // No token, load from local
            loadFromLocal(kapalId)
        }
    }

    private fun loadFromLocal(kapalId: Int) {
        lifecycleScope.launch {
            listDokumen.clear()
            listDokumen.addAll(database.dokumenDao().getDokumenByKapalId(kapalId))
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
        btnAddKapal.visibility = View.VISIBLE
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

    private fun showPdfSelectionDialog(pdfPaths: List<String>) {
        if (pdfPaths.isEmpty()) {
            Toast.makeText(this, "Tidak ada PDF untuk ditampilkan", Toast.LENGTH_SHORT).show()
            return
        }

        val pdfNames = pdfPaths.map { path ->
            File(path).name
        }
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Pilih PDF")
        builder.setItems(pdfNames.toTypedArray()) { _, which ->
            openPdf(pdfPaths[which])
        }
        builder.setNegativeButton("Batal", null)
        builder.show()
    }

    private fun showTambahDokumenDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_tambah_dokumen, null)
        val etJenisDokumen = dialogView.findViewById<android.widget.EditText>(R.id.et_jenis_dokumen_dialog)
        val etTanggalExpired = dialogView.findViewById<android.widget.EditText>(R.id.et_tanggal_expired_dialog)
        val btnSimpanDokumen = dialogView.findViewById<Button>(R.id.btn_simpan_dokumen)

        etTanggalExpired.setOnClickListener {
            val existing = dokumenEntity.tanggalKadaluarsa
            val c = java.util.Calendar.getInstance()
            if (existing != null) {
                try {
                    val parts = existing.split("/")
                    if (parts.size == 3) {
                        val day = parts[0].toInt()
                        val month = parts[1].toInt() - 1
                        val year = parts[2].toInt()
                        c.set(year, month, day)
                    }
                } catch (e: Exception) {
                    // Use current date
                }
            }
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
                    val token = getToken()
                    if (token.isNotEmpty()) {
                        try {
                            val response = apiService.createDokumen("Bearer $token", newDokumen)
                            if (response.isSuccessful) {
                                val createdDokumen = response.body()?.data
                                if (createdDokumen != null) {
                                    // Save to local
                                    database.dokumenDao().insertDokumen(createdDokumen)
                                    Toast.makeText(this@DocumentActivity, "Dokumen berhasil ditambahkan", Toast.LENGTH_SHORT).show()
                                    currentKapal?.id?.let { loadDokumenForKapal(it) }
                                    dialog.dismiss()
                                } else {
                                    Toast.makeText(this@DocumentActivity, "Failed to create dokumen", Toast.LENGTH_SHORT).show()
                                }
                            } else {
                                Toast.makeText(this@DocumentActivity, "Failed to sync to online DB", Toast.LENGTH_SHORT).show()
                                // Fallback to local
                                database.dokumenDao().insertDokumen(newDokumen)
                                Toast.makeText(this@DocumentActivity, "Dokumen berhasil ditambahkan (local only)", Toast.LENGTH_SHORT).show()
                                currentKapal?.id?.let { loadDokumenForKapal(it) }
                                dialog.dismiss()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(this@DocumentActivity, "Failed to sync to online DB", Toast.LENGTH_SHORT).show()
                            // Fallback to local
                            database.dokumenDao().insertDokumen(newDokumen)
                            Toast.makeText(this@DocumentActivity, "Dokumen berhasil ditambahkan (local only)", Toast.LENGTH_SHORT).show()
                            currentKapal?.id?.let { loadDokumenForKapal(it) }
                            dialog.dismiss()
                        }
                    } else {
                        // No token, save local only
                        database.dokumenDao().insertDokumen(newDokumen)
                        Toast.makeText(this@DocumentActivity, "Dokumen berhasil ditambahkan", Toast.LENGTH_SHORT).show()
                        currentKapal?.id?.let { loadDokumenForKapal(it) }
                        dialog.dismiss()
                    }
                }
            } else {
                Toast.makeText(this, "Jenis dokumen harus diisi", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
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
            // TODO: Show delete dialog for images
            Toast.makeText(this, "Hapus gambar belum diimplementasi", Toast.LENGTH_SHORT).show()
        }

        tvPdfList.setOnClickListener {
            // TODO: Show delete dialog for PDFs
            Toast.makeText(this, "Hapus PDF belum diimplementasi", Toast.LENGTH_SHORT).show()
        }

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(false)
            .create()

        btnSimpanDokumen.setOnClickListener {
            val jenis = etJenisDokumen.text.toString()
            val tanggalExpired = etTanggalExpired.text.toString()
            if (jenis.isNotEmpty()) {
                // Merge existing files with new additions
                val allImages = existingPathGambar + pendingGambarAdditions
                val allPdfs = existingPathPdf + pendingPdfAdditions

                Log.d("DocumentActivity", "existingPathGambar: $existingPathGambar")
                Log.d("DocumentActivity", "pendingGambarAdditions: $pendingGambarAdditions")
                Log.d("DocumentActivity", "allImages: $allImages")
                Log.d("DocumentActivity", "existingPathPdf: $existingPathPdf")
                Log.d("DocumentActivity", "pendingPdfAdditions: $pendingPdfAdditions")
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
                    val token = getToken()
                    if (token.isNotEmpty()) {
                        try {
                            val response = apiService.updateDokumen("Bearer $token", updatedDokumen.id, updatedDokumen)
                            if (response.isSuccessful) {
                                // Update local
                                database.dokumenDao().updateDokumen(updatedDokumen)
                                Toast.makeText(this@DocumentActivity, "Dokumen berhasil diperbarui", Toast.LENGTH_SHORT).show()
                                currentKapal?.id?.let { loadDokumenForKapal(it) }
                                dialog.dismiss()
                            } else {
                                Toast.makeText(this@DocumentActivity, "Failed to sync to online DB", Toast.LENGTH_SHORT).show()
                                // Fallback to local
                                database.dokumenDao().updateDokumen(updatedDokumen)
                                Toast.makeText(this@DocumentActivity, "Dokumen berhasil diperbarui (local only)", Toast.LENGTH_SHORT).show()
                                currentKapal?.id?.let { loadDokumenForKapal(it) }
                                dialog.dismiss()
                            }
                        } catch (e: Exception) {
                            Toast.makeText(this@DocumentActivity, "Failed to sync to online DB", Toast.LENGTH_SHORT).show()
                            // Fallback to local
                            database.dokumenDao().updateDokumen(updatedDokumen)
                            Toast.makeText(this@DocumentActivity, "Dokumen berhasil diperbarui (local only)", Toast.LENGTH_SHORT).show()
                            currentKapal?.id?.let { loadDokumenForKapal(it) }
                            dialog.dismiss()
                        }
                    } else {
                        // No token, update local only
                        database.dokumenDao().updateDokumen(updatedDokumen)
                        Toast.makeText(this@DocumentActivity, "Dokumen berhasil diperbarui", Toast.LENGTH_SHORT).show()
                        currentKapal?.id?.let { loadDokumenForKapal(it) }
                        dialog.dismiss()
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
        dokumenAdapter: DokumenAdapter,
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
                    val fileUrl = copyFileToLocal(uri, mimeType)
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
                        Toast.makeText(this@DocumentActivity, "Gagal copy file", Toast.LENGTH_SHORT).show()
                    }
                }
                // Update the counts in the dialog
                updateFileCounts()
                // Note: No database update here - changes only happen on save
                currentDokumenPosition = -1
            }
        }
    }

    private suspend fun copyFileToLocal(uri: Uri, mimeType: String): String? {
        return try {
            val inputStream = contentResolver.openInputStream(uri) ?: return null
            val extension = when {
                mimeType.contains("pdf") -> ".pdf"
                mimeType.startsWith("image") -> ".jpg"
                else -> ""
            }
            val fileName = "file_${System.currentTimeMillis()}$extension"
            val dir = File(filesDir, "documents")
            if (!dir.exists()) dir.mkdirs()
            val file = File(dir, fileName)
            file.outputStream().use { output ->
                inputStream.copyTo(output)
            }
            file.absolutePath
        } catch (e: Exception) {
            Log.e("DocumentActivity", "Error copy file: ${e.message}")
            null
        }
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
