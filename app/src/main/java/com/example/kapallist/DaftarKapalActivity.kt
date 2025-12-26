package com.example.kapallist

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView  // Tambahkan import TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.google.android.material.floatingactionbutton.FloatingActionButton
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch


class DaftarKapalActivity : AppCompatActivity() {
    private lateinit var database: KapalDatabase
    private lateinit var kapalAdapter: KapalAdapter
    private val kapalList = mutableListOf<KapalEntity>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()  // Menghilangkan ActionBar sesuai permintaan
        setContentView(R.layout.activity_daftar_kapal)

        database = KapalDatabase.getDatabase(this)

        val btnBack = findViewById<FloatingActionButton>(R.id.btn_back)
        btnBack.setOnClickListener {
            finish()
        }

        val etNamaKapal = findViewById<EditText>(R.id.et_nama_kapal_daftar)
        val btnTambah = findViewById<Button>(R.id.btn_tambah_kapal_daftar)
        val rvKapalList = findViewById<RecyclerView>(R.id.rv_kapal_list)

        kapalAdapter = KapalAdapter(
            kapalList,
            onItemClick = { kapal -> showInfoKapalDialog(kapal) },
            onEditClick = { kapal -> showEditKapalDialog(kapal) },
            onDeleteClick = { kapal -> showDeleteConfirmationDialog(kapal) }
        )

        rvKapalList.layoutManager = LinearLayoutManager(this)
        rvKapalList.adapter = kapalAdapter

        btnTambah.setOnClickListener {
            val namaBaru = etNamaKapal.text.toString().trim()
            if (namaBaru.isNotEmpty()) {
                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@DaftarKapalActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        val kapalEntity = KapalEntity(nama = namaBaru)
                        val response = ApiClient.apiService.createKapal("Bearer $token", kapalEntity)
                        if (response.isSuccessful) {
                            val apiResponse = response.body()
                            if (apiResponse?.success == true) {
                                val createdKapal = apiResponse.data
                                if (createdKapal != null) {
                                    kapalList.add(createdKapal)
                                    kapalAdapter.notifyItemInserted(kapalList.size - 1)
                                    etNamaKapal.text.clear()
                                    Toast.makeText(this@DaftarKapalActivity, "Kapal berhasil ditambahkan", Toast.LENGTH_SHORT).show()
                                }
                            } else {
                                Toast.makeText(this@DaftarKapalActivity, "Gagal menambah kapal", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(this@DaftarKapalActivity, "Gagal menambah kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@DaftarKapalActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                Toast.makeText(this, "Nama kapal harus diisi", Toast.LENGTH_SHORT).show()
            }
        }

        loadKapalList()
    }

    private fun loadKapalList() {
        lifecycleScope.launch {
            val allKapal = database.kapalDao().getAllKapal()
            kapalList.clear()
            kapalList.addAll(allKapal)
            kapalAdapter.notifyDataSetChanged()
        }
    }

    // Dialog baru: Info Kapal (read-only)
    private fun showInfoKapalDialog(kapal: KapalEntity) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_detail_kapal, null)
        val tvNamaPemilik = dialogView.findViewById<TextView>(R.id.tv_nama_pemilik)
        val tvTandaSelar = dialogView.findViewById<TextView>(R.id.tv_tanda_selar)
        val tvTandaPengenal = dialogView.findViewById<TextView>(R.id.tv_tanda_pengenal)
        val tvBeratKotor = dialogView.findViewById<TextView>(R.id.tv_berat_kotor)
        val tvBeratBersih = dialogView.findViewById<TextView>(R.id.tv_berat_bersih)
        val tvMerekMesin = dialogView.findViewById<TextView>(R.id.tv_merek_mesin)
        val tvNomorSeriMesin = dialogView.findViewById<TextView>(R.id.tv_nomor_seri_mesin)
        val tvJenisAlatTangkap = dialogView.findViewById<TextView>(R.id.tv_jenis_alat_tangkap)

        tvNamaPemilik.text = "Nama Pemilik: ${kapal.namaPemilik ?: "Belum diisi"}"
        tvTandaSelar.text = "Tanda Selar: ${kapal.tandaSelar ?: "Belum diisi"}"
        tvTandaPengenal.text = "Tanda Pengenal: ${kapal.tandaPengenal ?: "Belum diisi"}"
        tvBeratKotor.text = "Berat Kotor: ${kapal.beratKotor ?: "Belum diisi"}"
        tvBeratBersih.text = "Berat Bersih: ${kapal.beratBersih ?: "Belum diisi"}"
        tvMerekMesin.text = "Merek Mesin: ${kapal.merekMesin ?: "Belum diisi"}"
        tvNomorSeriMesin.text = "Nomor Seri Mesin: ${kapal.nomorSeriMesin ?: "Belum diisi"}"
        tvJenisAlatTangkap.text = "Jenis Alat Tangkap: ${kapal.jenisAlatTangkap ?: "Belum diisi"}"

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setTitle("Informasi Kapal: ${kapal.nama ?: "Tanpa Nama"}")  // Handle null
            .setNegativeButton("Tutup", null)
            .create()

        dialog.show()
    }

    private fun showDeleteConfirmationDialog(kapal: KapalEntity) {
        AlertDialog.Builder(this)
            .setTitle("Konfirmasi Hapus")
            .setMessage("Apakah Anda yakin ingin menghapus kapal '${kapal.nama}'?")
            .setPositiveButton("Hapus") { _, _ ->
                lifecycleScope.launch {
                    database.kapalDao().deleteKapalById(kapal.id)
                    kapalList.remove(kapal)
                    kapalAdapter.notifyDataSetChanged()
                    Toast.makeText(this@DaftarKapalActivity, "Kapal berhasil dihapus", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    // Dialog edit (seperti asli, tapi pastikan field bisa diedit)
    private fun showEditKapalDialog(kapal: KapalEntity) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_edit_detail_kapal, null)

        val etNamaPemilik = dialogView.findViewById<EditText>(R.id.et_nama_pemilik)
        val etTandaSelar = dialogView.findViewById<EditText>(R.id.et_tanda_selar)
        val etTandaPengenal = dialogView.findViewById<EditText>(R.id.et_tanda_pengenal)
        val etBeratKotor = dialogView.findViewById<EditText>(R.id.et_berat_kotor)
        val etBeratBersih = dialogView.findViewById<EditText>(R.id.et_berat_bersih)
        val etMerekMesin = dialogView.findViewById<EditText>(R.id.et_merek_mesin)
        val etNomorSeriMesin = dialogView.findViewById<EditText>(R.id.et_nomor_seri_mesin)
        val etJenisAlatTangkap = dialogView.findViewById<EditText>(R.id.et_jenis_alat_tangkap)

        // Set nilai yang sudah ada pada kapal ke EditTexts
        etNamaPemilik.setText(kapal.namaPemilik)
        etTandaSelar.setText(kapal.tandaSelar)
        etTandaPengenal.setText(kapal.tandaPengenal)
        etBeratKotor.setText(kapal.beratKotor)
        etBeratBersih.setText(kapal.beratBersih)
        etMerekMesin.setText(kapal.merekMesin)
        etNomorSeriMesin.setText(kapal.nomorSeriMesin)
        etJenisAlatTangkap.setText(kapal.jenisAlatTangkap)

        AlertDialog.Builder(this)
            .setView(dialogView)
            .setTitle("Edit Detail Kapal")
            .setPositiveButton("Simpan") { _, _ ->
                val updatedKapal = kapal.copy(
                    namaPemilik = etNamaPemilik.text.toString(),
                    tandaSelar = etTandaSelar.text.toString(),
                    tandaPengenal = etTandaPengenal.text.toString(),
                    beratKotor = etBeratKotor.text.toString(),
                    beratBersih = etBeratBersih.text.toString(),
                    merekMesin = etMerekMesin.text.toString(),
                    nomorSeriMesin = etNomorSeriMesin.text.toString(),
                    jenisAlatTangkap = etJenisAlatTangkap.text.toString()
                )
                lifecycleScope.launch {
                    try {
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@DaftarKapalActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        val response = ApiClient.apiService.updateKapal("Bearer $token", kapal.id, updatedKapal)
                        if (response.isSuccessful) {
                            val apiResponse = response.body()
                            if (apiResponse?.success == true) {
                                loadKapalList()
                                Toast.makeText(this@DaftarKapalActivity, "Detail kapal diperbarui", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(this@DaftarKapalActivity, "Gagal memperbarui kapal", Toast.LENGTH_SHORT).show()
                            }
                        } else {
                            Toast.makeText(this@DaftarKapalActivity, "Gagal memperbarui kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@DaftarKapalActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }
}