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
import com.google.android.material.floatingactionbutton.FloatingActionButton
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class DocumentActivity : AppCompatActivity() {

    companion object {
        const val REQUEST_CODE_PICK_FILE = 1001
    }

    private lateinit var kapalAdapter: DocumentKapalAdapter
    private var listKapal = mutableListOf<Kapal>()
    private lateinit var database: KapalDatabase

    private var currentKapalPosition: Int = -1
    private var currentDokumenPosition: Int = -1

    private var currentDokumenAdapter: DokumenAdapter? = null
    private lateinit var rvKapalList: RecyclerView
    private lateinit var btnBack: FloatingActionButton
    private lateinit var btnAddDokumen: FloatingActionButton

    private var currentKapal: Kapal? = null
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

        rvKapalList = findViewById(R.id.rv_kapal_list)
        btnBack = findViewById(R.id.btn_back)
        btnAddDokumen = findViewById(R.id.btn_add_dokumen)
        btnBack.setOnClickListener { finish() }
        btnAddDokumen.setOnClickListener {
            currentKapal?.let { kapal ->
                showTambahDokumenDialog(kapal.listDokumen, currentDokumenAdapter!!)
            }
        }

        loadKapalList()

        kapalAdapter = DocumentKapalAdapter(listKapal) { kapal ->
            showDocumentList(kapal)
        }

        rvKapalList.layoutManager = LinearLayoutManager(this)
        rvKapalList.adapter = kapalAdapter
        rvKapalList.addItemDecoration(DividerItemDecoration(this, LinearLayoutManager.VERTICAL))
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
                        listKapal.addAll(kapalEntities.map { entity ->
                            Kapal(
                                id = entity.id,
                                nama = entity.nama ?: "",
                                tanggalInput = entity.tanggalInput,
                                tanggalKeberangkatan = entity.tanggalKeberangkatan,
                                totalHariPersiapan = entity.totalHariPersiapan,
                                tanggalBerangkat = entity.tanggalBerangkat,
                                tanggalKembali = entity.tanggalKembali,
                                listPersiapan = entity.listPersiapan.toMutableList(),
                                listDokumen = entity.listDokumen.toMutableList(),
                                isFinished = entity.isFinished,
                                perkiraanKeberangkatan = entity.perkiraanKeberangkatan,
                                durasiSelesaiPersiapan = entity.durasiSelesaiPersiapan
                            )
                        })
                        kapalAdapter.notifyDataSetChanged()
                    } else {
                        Toast.makeText(this@DocumentActivity, "Gagal memuat data kapal", Toast.LENGTH_LONG).show()
                    }
                } else {
                    Toast.makeText(this@DocumentActivity, "Gagal memuat data kapal: ${response.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@DocumentActivity, "Gagal memuat data", Toast.LENGTH_LONG).show()
                Log.e("DocumentActivity", "Load kapal error: ${e.message}")
            }
        }
    }

    fun setCurrentDokumenPosition(position: Int) {
        currentDokumenPosition = position
    }

    // Fungsi untuk menampilkan dialog detail kapal (hanya lihat dan hapus)
    private fun showDetailKapalDialog(kapal: Kapal) {
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
            .setCancelable(true)
            .create()

        dialog.show()
    }

    private fun showTambahDokumenDialog(
        dokumenList: MutableList<DokumenKapal>,
        dokumenAdapter: DokumenAdapter
    ) {
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
            if (jenis.isNotEmpty()) {
                dokumenList.add(DokumenKapal(jenis, mutableListOf(), mutableListOf(), tanggalExpired))
                dokumenAdapter.notifyItemInserted(dokumenList.size - 1)
                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@DocumentActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        val updatedKapal = currentKapal!!.copy(listDokumen = currentKapal!!.listDokumen)
                        val response = ApiClient.apiService.updateKapal("Bearer $token", currentKapal!!.id, updatedKapal)
                        if (!response.isSuccessful) {
                            Toast.makeText(this@DocumentActivity, "Gagal update kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@DocumentActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
                dialog.dismiss()
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

            uris.forEach { uri ->
                val mimeType = contentResolver.getType(uri) ?: ""
                val filePath = saveFileToInternalStorage(uri, mimeType)
                if (filePath != null) {
                    if (mimeType.startsWith("image")) pendingGambarAdditions.add(filePath)
                    else if (mimeType.contains("pdf")) pendingPdfAdditions.add(filePath)
                    else Toast.makeText(this, "File tipe ini tidak didukung", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Gagal menyimpan file", Toast.LENGTH_SHORT).show()
                }
            }
            // Update the counts in the dialog
            updateFileCounts()
            // Note: No database update here - changes only happen on save
            currentDokumenPosition = -1
        }
    }

    private fun saveFileToInternalStorage(uri: Uri, mimeType: String): String? {
        return try {
            val inputStream = contentResolver.openInputStream(uri) ?: return null
            val extension = when {
                mimeType.contains("pdf") -> ".pdf"
                mimeType.startsWith("image") -> ".jpg"
                else -> ""
            }
            val file = File(filesDir, "file_${System.currentTimeMillis()}$extension")
            FileOutputStream(file).use { outputStream -> inputStream.copyTo(outputStream) }
            inputStream.close()
            file.absolutePath
        } catch (e: IOException) {
            Log.e("DocumentActivity", "Error simpan file: ${e.message}")
            null
        }
    }

    private fun showDocumentList(kapal: Kapal) {
        currentKapal = kapal
        showingShipList = false
        currentDokumenAdapter = DokumenAdapter(
            kapal.listDokumen,
            onImagePreviewClick = { position ->
                val dokumen = kapal.listDokumen[position]
                showImagePreviewDialog(dokumen.pathGambar)
            },
            onPdfPreviewClick = { position ->
                val dokumen = kapal.listDokumen[position]
                showPdfSelectionDialog(dokumen.pathPdf)
            },
            onEditClick = { position ->
                showEditDokumenDialog(kapal.listDokumen, position, currentDokumenAdapter!!)
            }
        )
        rvKapalList.adapter = currentDokumenAdapter
        btnBack.setOnClickListener {
            showShipList()
        }
        btnAddDokumen.visibility = View.VISIBLE
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

        val pdfNames = pdfPaths.map { File(it).name }
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Pilih PDF")
        builder.setItems(pdfNames.toTypedArray()) { _, which ->
            openPdf(pdfPaths[which])
        }
        builder.setNegativeButton("Batal", null)
        builder.show()
    }

    private fun showEditDokumenDialog(
        dokumenList: MutableList<DokumenKapal>,
        position: Int,
        dokumenAdapter: DokumenAdapter
    ) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_edit_dokumen, null)
        val etJenisDokumen = dialogView.findViewById<android.widget.EditText>(R.id.et_jenis_edit)
        val etTanggalExpired = dialogView.findViewById<android.widget.EditText>(R.id.et_tanggal_expired_edit)
        val btnTambahGambar = dialogView.findViewById<Button>(R.id.btn_tambah_gambar_edit)
        val btnTambahPdf = dialogView.findViewById<Button>(R.id.btn_tambah_pdf_edit)
        val tvGambarList = dialogView.findViewById<TextView>(R.id.tv_gambar_list)
        val tvPdfList = dialogView.findViewById<TextView>(R.id.tv_pdf_list)
        val btnSimpanDokumen = dialogView.findViewById<Button>(R.id.btn_simpan_edit)

        val dokumen = dokumenList[position]
        etJenisDokumen.setText(dokumen.jenis)
        etTanggalExpired.setText(dokumen.tanggalExpired)

        // Initialize pending changes
        pendingGambarAdditions.clear()
        pendingPdfAdditions.clear()
        currentPendingGambarDeletions.clear()
        currentPendingPdfDeletions.clear()

        // Set current references
        currentTvGambarList = tvGambarList
        currentTvPdfList = tvPdfList
        currentDokumen = dokumen

        // Show original counts initially
        updateFileCounts()

        etTanggalExpired.setOnClickListener {
            val c = java.util.Calendar.getInstance()
            val dpd = android.app.DatePickerDialog(this, { _, y, m, d -> etTanggalExpired.setText("$d/${m + 1}/$y") }, c.get(java.util.Calendar.YEAR), c.get(java.util.Calendar.MONTH), c.get(java.util.Calendar.DAY_OF_MONTH))
            dpd.show()
        }

        btnTambahGambar.setOnClickListener {
            currentDokumenPosition = position
            pickFile("image/*")
        }

        btnTambahPdf.setOnClickListener {
            currentDokumenPosition = position
            pickFile("application/pdf")
        }

        tvGambarList.setOnClickListener {
            showDeleteFileDialog(dokumen.pathGambar, "Gambar", position, dokumenAdapter, currentPendingGambarDeletions)
        }

        tvPdfList.setOnClickListener {
            showDeleteFileDialog(dokumen.pathPdf, "PDF", position, dokumenAdapter, currentPendingPdfDeletions)
        }

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        btnSimpanDokumen.setOnClickListener {
            val jenis = etJenisDokumen.text.toString()
            val tanggalExpired = etTanggalExpired.text.toString()
            if (jenis.isNotEmpty()) {
                // Apply all pending changes
                val newGambarList = dokumen.pathGambar.toMutableList()
                val newPdfList = dokumen.pathPdf.toMutableList()

                // Remove deleted items (in reverse order to maintain indices)
                currentPendingGambarDeletions.sortedDescending().forEach { index ->
                    if (index < newGambarList.size) newGambarList.removeAt(index)
                }
                currentPendingPdfDeletions.sortedDescending().forEach { index ->
                    if (index < newPdfList.size) newPdfList.removeAt(index)
                }

                // Add new items
                newGambarList.addAll(pendingGambarAdditions)
                newPdfList.addAll(pendingPdfAdditions)

                dokumenList[position] = DokumenKapal(jenis, newGambarList, newPdfList, tanggalExpired)
                dokumenAdapter.notifyItemChanged(position)
                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@DocumentActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        val updatedKapal = currentKapal!!.copy(listDokumen = currentKapal!!.listDokumen)
                        val response = ApiClient.apiService.updateKapal("Bearer $token", currentKapal!!.id, updatedKapal)
                        if (!response.isSuccessful) {
                            Toast.makeText(this@DocumentActivity, "Gagal update kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@DocumentActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
                dialog.dismiss()
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
