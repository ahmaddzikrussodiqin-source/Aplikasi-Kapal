package com.example.kapallist

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.Intent
import com.google.android.material.floatingactionbutton.FloatingActionButton
import android.os.Bundle
import android.view.KeyEvent
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.launch
import java.util.Calendar

class InputActivity : AppCompatActivity() {
    private val listPersiapan = mutableListOf<String>()
    private val listDokumen = mutableListOf<DokumenKapal>()
    private lateinit var sharedPref: android.content.SharedPreferences
    private var editMode: Boolean = false
    private var kapalIndex: Int = -1
    private var selectedKapalId: Int? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_input)
        val btnBack = findViewById<FloatingActionButton>(R.id.btn_back)
        btnBack.setOnClickListener {
            finish()
        }

        sharedPref = getSharedPreferences("kapal_data", MODE_PRIVATE)

        // Check for edit mode
        editMode = intent.getBooleanExtra("edit_mode", false)
        selectedKapalId = intent.getIntExtra("kapal_id", -1).takeIf { it != -1 }

        val namaKapalFromIntent = intent.getStringExtra("nama_kapal")

        val etNamaKapal = findViewById<EditText>(R.id.et_nama_kapal)
        val etTanggalKembali = findViewById<EditText>(R.id.et_tanggal_kembali)
        val etPersiapan = findViewById<EditText>(R.id.et_persiapan)
        val btnTambahPersiapan = findViewById<Button>(R.id.btn_tambah_persiapan)
        val llPersiapanList = findViewById<LinearLayout>(R.id.ll_persiapan_list)
        val btnSimpan = findViewById<Button>(R.id.btn_simpan)

        if (editMode && selectedKapalId != null) {
            // Load existing kapal data for editing
            loadKapalDataForEdit(selectedKapalId!!, etNamaKapal, etTanggalKembali, llPersiapanList)
        } else {
            if (namaKapalFromIntent != null) {
                etNamaKapal.setText(namaKapalFromIntent)
            }
        }

        // Load kapal names from API (daftar kapal untuk referensi)
        etNamaKapal.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                    val token = sharedPref.getString("token", "") ?: ""
                    if (token.isEmpty()) {
                        Toast.makeText(this@InputActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                        return@launch
                    }

                    val response = ApiClient.apiService.getAllKapal("Bearer $token")
                    if (response.isSuccessful) {
                        val apiResponse = response.body()
                        if (apiResponse?.success == true) {
                            val kapalList = apiResponse.data ?: emptyList()
                            val namaKapalList = kapalList.mapNotNull { it.nama }
                            if (namaKapalList.isNotEmpty()) {
                                val builder = AlertDialog.Builder(this@InputActivity)
                                builder.setTitle("Pilih Nama Kapal (Referensi)")
                                builder.setItems(namaKapalList.toTypedArray()) { _, which ->
                                    etNamaKapal.setText(namaKapalList[which])
                                    // Tidak set selectedKapalId karena ini untuk kapal masuk baru
                                }
                                builder.setNegativeButton("Batal", null)
                                builder.show()
                            } else {
                                Toast.makeText(this@InputActivity, "Tidak ada kapal tersimpan", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(this@InputActivity, "Gagal memuat data kapal", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(this@InputActivity, "Gagal memuat data kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@InputActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        etPersiapan.setOnKeyListener { _, keyCode, event ->
            if (event.action == KeyEvent.ACTION_DOWN && keyCode == KeyEvent.KEYCODE_ENTER) {
                val persiapanText = etPersiapan.text.toString().trim()
                if (persiapanText.isNotEmpty()) {
                    val items = persiapanText.split("\n").map { it.trim() }.filter { it.isNotBlank() }
                    if (items.isNotEmpty()) {
                        listPersiapan.addAll(items)
                        etPersiapan.text.clear()
                        updatePersiapanListUI(llPersiapanList)
                    } else {
                        Toast.makeText(this, "Persiapan tidak boleh kosong", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(this, "Persiapan tidak boleh kosong", Toast.LENGTH_SHORT).show()
                }
                true
            } else {
                false
            }
        }

        etTanggalKembali.setOnClickListener {
            val calendar = Calendar.getInstance()
            val year = calendar.get(Calendar.YEAR)
            val month = calendar.get(Calendar.MONTH)
            val day = calendar.get(Calendar.DAY_OF_MONTH)

            val datePickerDialog = DatePickerDialog(this, { _, selectedYear, selectedMonth, selectedDay ->
                val selectedDate = "$selectedDay/${selectedMonth + 1}/$selectedYear"
                etTanggalKembali.setText(selectedDate)
            }, year, month, day)
            datePickerDialog.show()
        }

        btnTambahPersiapan.setOnClickListener {
            val persiapanText = etPersiapan.text.toString().trim()
            if (persiapanText.isNotEmpty()) {
                val items = persiapanText.split("\n").map { it.trim() }.filter { it.isNotBlank() }
                if (items.isNotEmpty()) {
                    listPersiapan.addAll(items)
                    etPersiapan.text.clear()
                    updatePersiapanListUI(llPersiapanList)
                } else {
                    Toast.makeText(this, "Persiapan tidak boleh kosong", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(this, "Persiapan tidak boleh kosong", Toast.LENGTH_SHORT).show()
            }
        }

        btnSimpan.setOnClickListener {
            val namaKapal = etNamaKapal.text.toString()
            val tanggalKembali = etTanggalKembali.text.toString()

            if (namaKapal.isNotEmpty() && tanggalKembali.isNotEmpty() && listPersiapan.isNotEmpty()) {
                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@InputActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        // Convert to KapalMasukEntity for API (selalu buat entry baru di kapal_masuk_schema)
                        val kapalMasukEntity = KapalMasukEntity(
                            id = 0,  // Selalu 0 untuk entry baru
                            nama = namaKapal,
                            tanggalKembali = tanggalKembali,
                            listPersiapan = listPersiapan,
                            tanggalInput = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault()).format(java.util.Date()),
                            statusKerja = "persiapan"  // Default status
                        )

                        // Selalu create new kapal masuk (tidak pernah update existing)
                        val response = ApiClient.apiService.createKapalMasuk("Bearer $token", kapalMasukEntity)

                        if (response.isSuccessful) {
                            Toast.makeText(this@InputActivity, "Kapal Masuk disimpan!", Toast.LENGTH_SHORT).show()
                            finish()
                        } else {
                            Toast.makeText(this@InputActivity, "Gagal menyimpan kapal masuk: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@InputActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                Toast.makeText(this, "Nama kapal, tanggal kembali, dan persiapan harus diisi", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun updatePersiapanListUI(llPersiapanList: LinearLayout) {
        llPersiapanList.removeAllViews()
        for ((index, persiapan) in listPersiapan.withIndex()) {
            val itemView = layoutInflater.inflate(R.layout.item_persiapan, llPersiapanList, false)
            val tvItem = itemView.findViewById<TextView>(R.id.tv_item)
            val ivDelete = itemView.findViewById<ImageView>(R.id.iv_delete)

            tvItem.text = "${index + 1}. $persiapan"
            ivDelete.setOnClickListener {
                listPersiapan.removeAt(index)
                updatePersiapanListUI(llPersiapanList)
            }

            llPersiapanList.addView(itemView)
        }
    }

    private fun loadKapalDataForEdit(kapalId: Int, etNamaKapal: EditText, etTanggalKembali: EditText, llPersiapanList: LinearLayout) {
        lifecycleScope.launch {
            try {
                val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                val token = sharedPref.getString("token", "") ?: ""
                if (token.isEmpty()) {
                    Toast.makeText(this@InputActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                    return@launch
                }

                val response = ApiClient.apiService.getKapalMasukById("Bearer $token", kapalId)
                if (response.isSuccessful) {
                    val apiResponse = response.body()
                    if (apiResponse?.success == true) {
                        val kapal = apiResponse.data
                        if (kapal != null) {
                            etNamaKapal.setText(kapal.nama)
                            etTanggalKembali.setText(kapal.tanggalKembali)
                            listPersiapan.clear()
                            listPersiapan.addAll(kapal.listPersiapan ?: emptyList())
                            updatePersiapanListUI(llPersiapanList)
                        } else {
                            Toast.makeText(this@InputActivity, "Data kapal tidak ditemukan", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(this@InputActivity, "Gagal memuat data kapal", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(this@InputActivity, "Gagal memuat data kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@InputActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
