package com.example.kapallist

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.gson.Gson
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Locale

class ProfileActivity : AppCompatActivity() {
    private lateinit var rvKapalMasuk: RecyclerView
    private lateinit var etFilter: EditText
    private lateinit var spinnerOwner: Spinner
private lateinit var btnBack: FloatingActionButton
    private lateinit var fabTambahStatus: FloatingActionButton
    private lateinit var kapalMasukAdapter: KapalMasukAdapter
    private val listKapalMasuk = mutableListOf<KapalMasukEntity>()
    private val listAllKapalMasuk = mutableListOf<KapalMasukEntity>()
    private lateinit var socket: Socket
    private var currentFilterText = ""
    private var currentOwnerFilter = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_profile)

        initViews()
        setupFilters()
        setupSocket()
        loadDataAndBuildUI()
    }

    private fun initViews() {
        rvKapalMasuk = findViewById(R.id.rv_kapal_masuk)
        etFilter = findViewById(R.id.et_filter_persiapan)
        spinnerOwner = findViewById(R.id.spinner_filter_owner)
        btnBack = findViewById(R.id.btn_back)
        fabTambahStatus = findViewById(R.id.fab_tambah_status)

        btnBack.setOnClickListener { finish() }
        fabTambahStatus.setOnClickListener {
            val intent = Intent(this, InputActivity::class.java)
            startActivity(intent)
        }

        rvKapalMasuk.layoutManager = LinearLayoutManager(this)
        rvKapalMasuk.addItemDecoration(DividerItemDecoration(this, LinearLayoutManager.VERTICAL))

kapalMasukAdapter = KapalMasukAdapter(listKapalMasuk, this, ::showKapalInfoDialog, ::editKapal, ::tambahKebutuhan, ::finishKapal, ::unfinishKapal)
        rvKapalMasuk.adapter = kapalMasukAdapter
    }

    private fun setupFilters() {
        etFilter.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                currentFilterText = s.toString().trim()
                applyFilter()
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        spinnerOwner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                currentOwnerFilter = if (position == 0) "" else parent?.getItemAtPosition(position).toString()
                applyFilter()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {
                currentOwnerFilter = ""
                applyFilter()
            }
        }
    }

    private fun setupSocket() {
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val token = sharedPref.getString("token", "") ?: ""
        if (token.isNotEmpty()) {
            try {
                val opts = IO.Options()
                opts.auth = mapOf("token" to token)
                socket = IO.socket(Config.BASE_URL, opts)
                socket.connect()
                socket.on("checklist-updated") { args ->
                    runOnUiThread {
                        val data = args[0] as JSONObject
                        val kapalId = data.getInt("kapalId")
                        val position = listKapalMasuk.indexOfFirst { it.id == kapalId }
                        if (position != -1) {
                            kapalMasukAdapter.notifyItemChanged(position)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("Socket", "Error initializing socket: ${e.message}")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        loadDataAndBuildUI()
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            socket.disconnect()
        } catch (e: Exception) {}
    }

    private fun loadDataAndBuildUI() {
        lifecycleScope.launch {
            try {
                val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                val token = sharedPref.getString("token", "") ?: ""
                if (token.isEmpty()) {
                    Toast.makeText(this@ProfileActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                    return@launch
                }

                val response = ApiClient.apiService.getAllKapalMasuk("Bearer $token")
                if (response.isSuccessful) {
                    val apiResponse = response.body()
                    if (apiResponse != null && apiResponse.success) {
                        val kapalMasukList = apiResponse.data ?: emptyList()
                        listAllKapalMasuk.clear()
                        listAllKapalMasuk.addAll(kapalMasukList)
                        applyFilter()
                        setupOwnerSpinner()
                    }
                }
            } catch (e: Exception) {
                Log.e("ProfileActivity", "Error loading data: ${e.message}")
                Toast.makeText(this@ProfileActivity, "Gagal memuat data", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupOwnerSpinner() {
        val owners = listAllKapalMasuk.mapNotNull { it.namaPemilik }.distinct().toMutableList()
        owners.add(0, "Semua")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, owners)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerOwner.adapter = adapter
    }

    private fun applyFilter() {
        val filtered = listAllKapalMasuk.filter { kapal ->
            (kapal.nama ?: "").contains(currentFilterText, ignoreCase = true) &&
            (currentOwnerFilter.isEmpty() || kapal.namaPemilik == currentOwnerFilter)
        }
        kapalMasukAdapter.updateList(filtered)
    }

private fun showKapalInfoDialog(kapal: KapalMasukEntity) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_view_kapal, null)
        
        dialogView.findViewById<TextView>(R.id.tv_nama_kapal_view).text = "Nama Kapal: ${kapal.nama ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_nama_pemilik_view).text = "Nama Pemilik: ${kapal.namaPemilik ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_tanda_selar_view).text = "Tanda Selar: ${kapal.tandaSelar ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_tanda_pengenal_view).text = "Tanda Pengenal: ${kapal.tandaPengenal ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_berat_kotor_view).text = "Berat Kotor: ${kapal.beratKotor ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_berat_bersih_view).text = "Berat Bersih: ${kapal.beratBersih ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_merek_mesin_view).text = "Merek Mesin: ${kapal.merekMesin ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_nomor_seri_mesin_view).text = "Nomor Seri Mesin: ${kapal.nomorSeriMesin ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_jenis_alat_tangkap_view).text = "Jenis Alat Tangkap: ${kapal.jenisAlatTangkap ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_tanggal_input_view).text = "Tanggal Input: ${kapal.tanggalInput ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_tanggal_keberangkatan_view).text = "Tanggal Keberangkatan: ${kapal.tanggalKeberangkatan ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_durasi_berlayar_view).text = "Durasi Berlayar: ${kapal.durasiBerlayar ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_status_kerja_view).text = "Status Kerja: ${kapal.statusKerja ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_status_view).text = "Status: ${kapal.status ?: "-"}"
        dialogView.findViewById<TextView>(R.id.tv_is_finished_view).text = "Selesai: ${if (kapal.isFinished) "Ya" else "Tidak"}"

        AlertDialog.Builder(this)
            .setView(dialogView)
            .setPositiveButton("Tutup", null)
            .show()
    }

    private fun deleteKapal(kapal: KapalMasukEntity) {
        AlertDialog.Builder(this)
            .setTitle("Konfirmasi Hapus")
            .setMessage("Hapus status kapal ${kapal.nama}?")
            .setPositiveButton("Hapus") { _, _ ->
                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        val response = ApiClient.apiService.deleteKapalMasuk("Bearer $token", kapal.id)
                        if (response.isSuccessful && response.body()?.success == true) {
                            loadDataAndBuildUI()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@ProfileActivity, "Gagal hapus", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun editKapal(kapal: KapalMasukEntity) {
        val intent = Intent(this, InputActivity::class.java).apply {
            putExtra("edit_mode", true)
            putExtra("kapal_id", kapal.id)
        }
        startActivity(intent)
    }

    private fun tambahKebutuhan(kapal: KapalMasukEntity) {
        Toast.makeText(this, "Tambah kebutuhan untuk ${kapal.nama}", Toast.LENGTH_SHORT).show()
    }

    private fun unfinishKapal(kapal: KapalMasukEntity) {
        val updatedKapal = kapal.copy(isFinished = false)
        lifecycleScope.launch {
            try {
                val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                val token = sharedPref.getString("token", "") ?: ""
                val response = ApiClient.apiService.updateKapalMasuk("Bearer $token", kapal.id, updatedKapal)
                if (response.isSuccessful && response.body()?.success == true) {
                    val position = listKapalMasuk.indexOf(kapal)
                    if (position != -1) {
                        listKapalMasuk[position] = updatedKapal
                        kapalMasukAdapter.notifyItemChanged(position)
                    }
                }
            } catch (e: Exception) {
                Log.e("ProfileActivity", "Error unfinishing kapal: ${e.message}")
            }
        }
    }

    private fun finishKapal(kapal: KapalMasukEntity) {
        val checkedCount = (kapal.checklistStates?.values?.count { it == true } ?: 0)
        val total = kapal.listPersiapan.size
        val completion = if (total > 0) (checkedCount * 100 / total) else 0
        
        Toast.makeText(this, "Kapal selesai $completion% checklist", Toast.LENGTH_SHORT).show()

        val updatedKapal = kapal.copy(isFinished = true)
        lifecycleScope.launch {
            try {
                val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                val token = sharedPref.getString("token", "") ?: ""
                val response = ApiClient.apiService.updateKapalMasuk("Bearer $token", kapal.id, updatedKapal)
                if (response.isSuccessful && response.body()?.success == true) {
                    val position = listKapalMasuk.indexOf(kapal)
                    if (position != -1) {
                        listKapalMasuk[position] = updatedKapal
                        kapalMasukAdapter.notifyItemChanged(position)
                    }
                }
            } catch (e: Exception) {
                Log.e("ProfileActivity", "Error finishing kapal: ${e.message}")
            }
        }
    }
}

