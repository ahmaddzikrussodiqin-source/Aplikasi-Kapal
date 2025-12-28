package com.example.kapallist

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.Intent
import com.google.android.material.floatingactionbutton.FloatingActionButton
import android.os.Bundle
import android.view.KeyEvent
import android.widget.Button
import android.widget.EditText
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

        editMode = intent.getBooleanExtra("edit_mode", false)
        kapalIndex = intent.getIntExtra("kapal_index", -1)
        val namaKapalFromIntent = intent.getStringExtra("nama_kapal")

        val etNamaKapal = findViewById<EditText>(R.id.et_nama_kapal)
        val etTanggalKembali = findViewById<EditText>(R.id.et_tanggal_kembali)
        val etPersiapan = findViewById<EditText>(R.id.et_persiapan)
        val btnTambahPersiapan = findViewById<Button>(R.id.btn_tambah_persiapan)
        val llPersiapanList = findViewById<LinearLayout>(R.id.ll_persiapan_list)
        val btnSimpan = findViewById<Button>(R.id.btn_simpan)

        if (namaKapalFromIntent != null) {
            etNamaKapal.setText(namaKapalFromIntent)
        }

        // Load kapal names from API
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
                                builder.setTitle("Pilih Nama Kapal")
                                builder.setItems(namaKapalList.toTypedArray()) { _, which ->
                                    etNamaKapal.setText(namaKapalList[which])
                                    selectedKapalId = kapalList[which].id
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

        // Edit mode removed for online version - would need kapal ID tracking

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

                        // Convert to KapalEntity for API
                        val kapalEntity = KapalEntity(
                            id = selectedKapalId ?: 0,  // Use selectedKapalId if available, else 0 for new
                            nama = namaKapal,
                            tanggalKembali = tanggalKembali,
                            listPersiapan = listPersiapan,
                            tanggalInput = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault()).format(java.util.Date())
                        )

                        val response = if (selectedKapalId != null) {
                            // Update existing kapal
                            ApiClient.apiService.updateKapal("Bearer $token", selectedKapalId!!, kapalEntity)
                        } else {
                            // Create new kapal
                            ApiClient.apiService.createKapal("Bearer $token", kapalEntity)
                        }

                        if (response.isSuccessful) {
                            Toast.makeText(this@InputActivity, "Kapal disimpan!", Toast.LENGTH_SHORT).show()
                            finish()
                        } else {
                            Toast.makeText(this@InputActivity, "Gagal menyimpan kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
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
            val tv = TextView(this)
            tv.text = "${index + 1}. $persiapan"
            tv.setOnLongClickListener {
                listPersiapan.removeAt(index)
                updatePersiapanListUI(llPersiapanList)
                true
            }
            llPersiapanList.addView(tv)
        }
    }
}