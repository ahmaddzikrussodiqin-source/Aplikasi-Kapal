package com.example.kapallist

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import com.google.android.material.floatingactionbutton.FloatingActionButton
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.CompoundButton
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date

class ProfileActivity : AppCompatActivity() {
    private val checkBoxStates = mutableMapOf<String, Boolean>()
    private val checkBoxDates = mutableMapOf<String, String>()
    private val listKapal = mutableListOf<Kapal>()
    private lateinit var userRole: String
    private var isProgrammaticChange = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_profile)
        val btnBack = findViewById<FloatingActionButton>(R.id.btn_back)
        btnBack.setOnClickListener {
            finish()
        }
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        userRole = sharedPref.getString("role", "Member") ?: "Member"  // Load role
        loadDataAndBuildUI()
    }

    override fun onResume() {
        super.onResume()
        loadDataAndBuildUI()
    }

    private fun loadDataAndBuildUI() {
        val llChecklist = findViewById<LinearLayout>(R.id.ll_checklist)

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
                    if (apiResponse?.success == true) {
                        val kapalMasukList = apiResponse.data ?: emptyList()
                        Log.d("ProfileActivity", "Received kapal masuk data: ${kapalMasukList.size} items")
                        kapalMasukList.forEach { kapalMasuk ->
                            Log.d("ProfileActivity", "Kapal: ${kapalMasuk.nama}, tanggalKeberangkatan: ${kapalMasuk.tanggalKeberangkatan}")
                        }
                        listKapal.clear()
                        // Convert KapalMasukEntity to Kapal
                        listKapal.addAll(kapalMasukList.map { kapalMasukEntity ->
                            Kapal(kapalMasukEntity)
                        })
                        runOnUiThread {
                            buildUI(llChecklist)
                        }
                    } else {
                        Toast.makeText(this@ProfileActivity, "Gagal memuat data kapal masuk", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(this@ProfileActivity, "Gagal memuat data kapal masuk: ${response.message()}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ProfileActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun buildUI(llChecklist: LinearLayout) {
        val stateJson = getSharedPreferences("kapal_data", MODE_PRIVATE).getString("checkbox_states", "{}")
        val stateType = object : TypeToken<MutableMap<String, Boolean>>() {}.type
        val savedStates: MutableMap<String, Boolean> = Gson().fromJson(stateJson, stateType)
        checkBoxStates.clear()
        checkBoxStates.putAll(savedStates)

        val dateJson = getSharedPreferences("kapal_data", MODE_PRIVATE).getString("checkbox_dates", "{}")
        val dateType = object : TypeToken<MutableMap<String, String>>() {}.type
        val savedDates: MutableMap<String, String> = Gson().fromJson(dateJson, dateType)
        checkBoxDates.clear()
        checkBoxDates.putAll(savedDates)

        llChecklist.removeAllViews()

        if (listKapal.isNotEmpty()) {
            for (kapal in listKapal) {
                // Create a horizontal layout for ship name and departure date
                val shipInfoLayout = LinearLayout(this)
                shipInfoLayout.orientation = LinearLayout.HORIZONTAL
                shipInfoLayout.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                shipInfoLayout.setPadding(0, 16, 0, 8)

                val tvKapal = TextView(this)
                val formattedKembali = formatTanggal(kapal.tanggalKembali ?: "")  // Handle null dengan Elvis
                val namaKapal = kapal.nama ?: ""
                val formattedKeberangkatan = formatTanggal(kapal.tanggalKeberangkatan ?: "")  // Format tanggal keberangkatan from database
                tvKapal.text = if (formattedKembali.isNotEmpty()) {
                    "Nama: $namaKapal, Kembali: $formattedKembali"
                } else {
                    "Nama: $namaKapal"
                }
                tvKapal.textSize = 16f
                tvKapal.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                shipInfoLayout.addView(tvKapal)

                // Display departure date from database on the right side
                val tvKeberangkatan = TextView(this)
                tvKeberangkatan.text = if (formattedKeberangkatan.isNotEmpty()) {
                    "Keberangkatan: $formattedKeberangkatan"
                } else {
                    "Keberangkatan: -"
                }
                tvKeberangkatan.textSize = 14f
                tvKeberangkatan.setTextColor(android.graphics.Color.BLUE)
                tvKeberangkatan.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { gravity = android.view.Gravity.END }
                shipInfoLayout.addView(tvKeberangkatan)

                llChecklist.addView(shipInfoLayout)

                val tvStatus = TextView(this)
                tvStatus.text = if (kapal.isFinished) "Completed" else "Not Complete"
                tvStatus.setTextColor(if (kapal.isFinished) android.graphics.Color.GREEN else android.graphics.Color.RED)
                tvStatus.textSize = 12f
                tvStatus.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { gravity = android.view.Gravity.END }
                llChecklist.addView(tvStatus)

                val tvDurasiBerlayar = TextView(this)
                val durasiBerlayar = if (!kapal.perkiraanKeberangkatan.isNullOrEmpty()) {
                    hitungDurasiBerlayar(kapal.perkiraanKeberangkatan)
                } else {
                    "Belum ada tanggal keberangkatan"
                }
                Log.d("ProfileActivity", "Kapal ${kapal.nama} - perkiraanKeberangkatan: ${kapal.perkiraanKeberangkatan}, durasiBerlayar: $durasiBerlayar")
                tvDurasiBerlayar.text = "Durasi Berlayar: $durasiBerlayar"
                tvDurasiBerlayar.textSize = 16f
                tvDurasiBerlayar.setTypeface(null, android.graphics.Typeface.BOLD)
                tvDurasiBerlayar.setTextColor(android.graphics.Color.RED)
                llChecklist.addView(tvDurasiBerlayar)

                if (!kapal.perkiraanKeberangkatan.isNullOrEmpty()) {
                    val tvPerkiraan = TextView(this)
                    tvPerkiraan.text = "Keberangkatan: ${kapal.perkiraanKeberangkatan}"
                    tvPerkiraan.textSize = 14f
                    llChecklist.addView(tvPerkiraan)

                    val tvDurasi = TextView(this)
                    tvDurasi.text = "Durasi Selesai Persiapan: ${kapal.durasiSelesaiPersiapan ?: "Belum selesai"}"  // Handle null dengan Elvis
                    tvDurasi.textSize = 12f
                    tvDurasi.setTextColor(android.graphics.Color.BLUE)
                    llChecklist.addView(tvDurasi)
                }

                val items = kapal.listPersiapan
                Log.d("ProfileActivity", "Checklist items for ${kapal.nama}: $items")

                val btnFinish = Button(this)
                btnFinish.text = if (kapal.isFinished) "Batal" else "Finish"  // Ubah teks berdasarkan status
                btnFinish.setBackgroundResource(R.drawable.button_rounded)
                btnFinish.setTextColor(android.graphics.Color.WHITE)
                btnFinish.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                val allCheckedInitial = items.all { checkBoxStates[it] == true }
                btnFinish.isEnabled = allCheckedInitial && !kapal.isFinished  // Disable jika sudah finished

                // Kontrol akses untuk Member: disable "Batal" jika role Member
                if (userRole == "Member" && kapal.isFinished) {
                    btnFinish.isEnabled = false
                    btnFinish.alpha = 0.5f
                } else if ((userRole == "Moderator" || userRole == "Supervisi") && kapal.isFinished) {
                    btnFinish.isEnabled = true  // Enable "Batal" untuk Moderator/Supervisi
                    btnFinish.alpha = 1.0f
                }

                for (item in items) {
                    if (item.isNotEmpty()) {
                        val itemLayout = LinearLayout(this)
                        itemLayout.orientation = LinearLayout.HORIZONTAL
                        itemLayout.layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        )

                        val checkBox = CheckBox(this)
                        checkBox.text = item
                        checkBox.isChecked = checkBoxStates[item] ?: false
                        checkBox.isEnabled = !kapal.isFinished
                        if (checkBox.isChecked) {
                            checkBox.paintFlags = checkBox.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                        }
                        checkBox.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)

                        val tvDate = TextView(this)
                        tvDate.text = checkBoxDates[item] ?: ""
                        tvDate.setTextColor(android.graphics.Color.BLACK)
                        tvDate.textSize = 12f
                        tvDate.layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply { gravity = android.view.Gravity.END }

                        itemLayout.addView(checkBox)
                        itemLayout.addView(tvDate)

                        var checkBoxListener: CompoundButton.OnCheckedChangeListener? = null
                        checkBoxListener = CompoundButton.OnCheckedChangeListener { _, isChecked ->
                            if (!kapal.isFinished) {
                                if (isChecked) {
                                    // Show confirmation dialog for checking
                                    val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                                    alertDialog.setMessage("Yakin ingin menyelesaikan ?")
                                    alertDialog.setPositiveButton("Yakin") { _, _ ->
                                        checkBoxStates[item] = true
                                        val dateFormat = SimpleDateFormat("dd/MM/yyyy")
                                        val currentDate = dateFormat.format(Date())
                                        checkBoxDates[item] = currentDate
                                        tvDate.text = currentDate
                                        checkBox.paintFlags = checkBox.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG

                                        val editor = getSharedPreferences("kapal_data", MODE_PRIVATE).edit()
                                        val updatedStateJson = Gson().toJson(checkBoxStates)
                                        editor.putString("checkbox_states", updatedStateJson)
                                        val updatedDateJson = Gson().toJson(checkBoxDates)
                                        editor.putString("checkbox_dates", updatedDateJson)
                                        editor.apply()

                                        val allCheckedNow = items.all { checkBoxStates[it] == true }
                                        btnFinish.isEnabled = allCheckedNow && !kapal.isFinished
                                    }
                                    alertDialog.setNegativeButton("Batal") { _, _ ->
                                        checkBox.setOnCheckedChangeListener(null)
                                        checkBox.isChecked = false
                                        checkBox.setOnCheckedChangeListener(checkBoxListener)
                                    }
                                    alertDialog.setCancelable(false)
                                    alertDialog.show()
                                } else {
                                    // Show confirmation dialog for unchecking
                                    val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                                    alertDialog.setMessage("Yakin ingin membatalkan ?")
                                    alertDialog.setPositiveButton("Yakin") { _, _ ->
                                        checkBoxStates[item] = false
                                        checkBoxDates.remove(item)
                                        tvDate.text = ""
                                        checkBox.paintFlags = checkBox.paintFlags and android.graphics.Paint.STRIKE_THRU_TEXT_FLAG.inv()

                                        val editor = getSharedPreferences("kapal_data", MODE_PRIVATE).edit()
                                        val updatedStateJson = Gson().toJson(checkBoxStates)
                                        editor.putString("checkbox_states", updatedStateJson)
                                        val updatedDateJson = Gson().toJson(checkBoxDates)
                                        editor.putString("checkbox_dates", updatedDateJson)
                                        editor.apply()

                                        val allCheckedNow = items.all { checkBoxStates[it] == true }
                                        btnFinish.isEnabled = allCheckedNow && !kapal.isFinished
                                    }
                                    alertDialog.setNegativeButton("Batal") { _, _ ->
                                        checkBox.setOnCheckedChangeListener(null)
                                        checkBox.isChecked = true
                                        checkBox.setOnCheckedChangeListener(checkBoxListener)
                                    }
                                    alertDialog.setCancelable(false)
                                    alertDialog.show()
                                }
                            }
                        }
                        checkBox.setOnCheckedChangeListener(checkBoxListener)
                        llChecklist.addView(itemLayout)
                    }
                }

                val buttonLayout = LinearLayout(this)
                buttonLayout.orientation = LinearLayout.HORIZONTAL
                buttonLayout.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = 8 }
                llChecklist.addView(buttonLayout)

                val btnEdit = Button(this)
                btnEdit.text = "Edit"
                btnEdit.setBackgroundResource(R.drawable.button_rounded)
                btnEdit.setTextColor(android.graphics.Color.WHITE)
                btnEdit.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                // Enable/disable berdasarkan status
                btnEdit.isEnabled = !kapal.isFinished
                if (kapal.isFinished) {
                    btnEdit.alpha = 0.5f
                } else {
                    btnEdit.alpha = 1.0f
                }
                btnEdit.setOnClickListener {
                    if (!kapal.isFinished) {
                        val intent = Intent(this@ProfileActivity, InputActivity::class.java)
                        intent.putExtra("edit_mode", true)
                        intent.putExtra("kapal_id", kapal.id)
                        startActivity(intent)
                    } else {
                        Toast.makeText(this@ProfileActivity, "Kapal sudah selesai, tidak bisa diedit", Toast.LENGTH_SHORT).show()
                    }
                }
                buttonLayout.addView(btnEdit)

                btnFinish.setOnClickListener {
                    if (kapal.isFinished) {
                        // Undo finish jika tombol "Batal" dan role memungkinkan
                        if (userRole == "Moderator" || userRole == "Supervisi") {
                            // Show confirmation dialog for undo
                            val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                            alertDialog.setMessage("Yakin ingin membatalkan proses finish?")
                            alertDialog.setPositiveButton("Ya") { _, _ ->
                                val updatedKapal = kapal.copy(
                                    isFinished = false,
                                    perkiraanKeberangkatan = null,
                                    durasiSelesaiPersiapan = null
                                )
                                // Reset checkbox states untuk kapal ini
                                items.forEach { checkBoxStates[it] = false }
                                // Reset checkbox dates untuk kapal ini
                                items.forEach { checkBoxDates.remove(it) }
                                // Update via API
                                lifecycleScope.launch {
                                    try {
                                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                                        val token = sharedPref.getString("token", "") ?: ""
                                        if (token.isEmpty()) {
                                            Toast.makeText(this@ProfileActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                                            return@launch
                                        }

                                        Log.d("ProfileActivity", "Undoing finish for kapal id: ${kapal.id}, updatedKapal: $updatedKapal")
                                        val response = ApiClient.apiService.updateKapalMasuk("Bearer $token", kapal.id, updatedKapal.toKapalMasukEntity())
                                        Log.d("ProfileActivity", "Response code: ${response.code()}, message: ${response.message()}")
                                        if (response.isSuccessful) {
                                            val apiResponse = response.body()
                                            Log.d("ProfileActivity", "API response: $apiResponse")
                                            if (apiResponse?.success == true) {
                                                // Simpan state checkbox yang direset
                                                val editor = getSharedPreferences("kapal_data", MODE_PRIVATE).edit()
                                                val updatedStateJson = Gson().toJson(checkBoxStates)
                                                editor.putString("checkbox_states", updatedStateJson)
                                                val updatedDateJson = Gson().toJson(checkBoxDates)
                                                editor.putString("checkbox_dates", updatedDateJson)
                                                editor.apply()
                                                loadDataAndBuildUI()  // Reload UI
                                                Toast.makeText(this@ProfileActivity, "Proses finish dibatalkan", Toast.LENGTH_SHORT).show()
                                            } else {
                                                Toast.makeText(this@ProfileActivity, "Gagal membatalkan finish: ${apiResponse?.message}", Toast.LENGTH_SHORT).show()
                                            }
                                        } else {
                                            if (response.code() == 403) {
                                                val intent = Intent(this@ProfileActivity, LoginActivity::class.java)
                                                startActivity(intent)
                                                finish()
                                                Toast.makeText(this@ProfileActivity, "Token expired, please login again", Toast.LENGTH_SHORT).show()
                                            } else {
                                                Toast.makeText(this@ProfileActivity, "Gagal membatalkan finish: ${response.message()}", Toast.LENGTH_SHORT).show()
                                            }
                                        }
                                    } catch (e: Exception) {
                                        Toast.makeText(this@ProfileActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                            alertDialog.setNegativeButton("Tidak") { _, _ ->
                                // Do nothing, just dismiss the dialog
                            }
                            alertDialog.setCancelable(true)
                            alertDialog.show()
                        } else {
                            Toast.makeText(this@ProfileActivity, "Akses tidak diizinkan untuk membatalkan finish", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        // Kode finish asli
                        val allChecked = items.all { checkBoxStates[it] == true }
                        if (allChecked) {
                            val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                            alertDialog.setMessage("Tentukan perkiraan tanggal keberangkatan")
                            alertDialog.setPositiveButton("OK") { _, _ ->
                                val calendar = Calendar.getInstance()
                                val year = calendar.get(Calendar.YEAR)
                                val month = calendar.get(Calendar.MONTH)
                                val day = calendar.get(Calendar.DAY_OF_MONTH)
                                val datePickerDialog = DatePickerDialog(this@ProfileActivity, { _, selectedYear, selectedMonth, selectedDay ->
                                    val selectedDate = "$selectedDay ${getMonthName(selectedMonth)} $selectedYear"
                                    val tanggalSelesaiMillis = Calendar.getInstance().apply {
                                        set(selectedYear, selectedMonth, selectedDay, 0, 0, 0)
                                    }.timeInMillis
                                    val durasi = hitungDurasiSelesaiPersiapan(kapal.tanggalKembali, tanggalSelesaiMillis)
                                    val durasiBerlayar = hitungDurasiBerlayar(selectedDate)
                                    Toast.makeText(this@ProfileActivity, "Durasi berlayar dari tanggal keberangkatan hingga hari ini: $durasiBerlayar", Toast.LENGTH_LONG).show()
                                    val updatedKapal = kapal.copy(
                                        isFinished = true,
                                        perkiraanKeberangkatan = selectedDate,
                                        durasiSelesaiPersiapan = durasi
                                    )
                                    // Update via API
                                    lifecycleScope.launch {
                                        try {
                                            val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                                            val token = sharedPref.getString("token", "") ?: ""
                                            if (token.isEmpty()) {
                                                Toast.makeText(this@ProfileActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                                                return@launch
                                            }

                                            Log.d("ProfileActivity", "Updating kapal id: ${kapal.id}, updatedKapal: $updatedKapal")
                                            val response = ApiClient.apiService.updateKapalMasuk("Bearer $token", kapal.id, updatedKapal.toKapalMasukEntity())
                                            Log.d("ProfileActivity", "Response code: ${response.code()}, message: ${response.message()}")
                                            if (response.isSuccessful) {
                                                val apiResponse = response.body()
                                                Log.d("ProfileActivity", "API response: $apiResponse")
                                                if (apiResponse?.success == true) {
                                                    loadDataAndBuildUI()
                                                    Toast.makeText(this@ProfileActivity, "Kapal selesai!", Toast.LENGTH_SHORT).show()
                                                } else {
                                                    Toast.makeText(this@ProfileActivity, "Gagal update kapal: ${apiResponse?.message}", Toast.LENGTH_SHORT).show()
                                                }
                                            } else {
                                                if (response.code() == 403) {
                                                    val intent = Intent(this@ProfileActivity, LoginActivity::class.java)
                                                    startActivity(intent)
                                                    finish()
                                                    Toast.makeText(this@ProfileActivity, "Token expired, please login again", Toast.LENGTH_SHORT).show()
                                                } else {
                                                    Toast.makeText(this@ProfileActivity, "Gagal update kapal: ${response.message()}", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                        } catch (e: Exception) {
                                            Toast.makeText(this@ProfileActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }, year, month, day)
                                datePickerDialog.setTitle("Pilih Perkiraan Keberangkatan")
                                datePickerDialog.show()
                            }
                            alertDialog.setCancelable(true)
                            alertDialog.show()
                        } else {
                            Toast.makeText(this@ProfileActivity, "Semua checklist harus dicentang", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                buttonLayout.addView(btnFinish)

                val separator = View(this)
                separator.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    2
                )
                separator.setBackgroundColor(ContextCompat.getColor(this, android.R.color.darker_gray))
                llChecklist.addView(separator)
            }
        } else {
            val noData = TextView(this)
            noData.text = getString(R.string.tidak_ada_item)
            llChecklist.addView(noData)
        }
    }

    private fun hitungDurasiBerlayar(perkiraanKeberangkatan: String?): String {
        if (perkiraanKeberangkatan.isNullOrEmpty()) return "Belum berlayar"
        try {
            val parts = perkiraanKeberangkatan.split(" ")
            if (parts.size == 3) {
                val day = parts[0].toInt()
                val monthName = parts[1].lowercase()
                val year = parts[2].toInt()
                val monthNames = arrayOf("januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember")
                val month = monthNames.indexOf(monthName)
                if (month == -1) return "Tanggal invalid"

                val keberangkatanCalendar = Calendar.getInstance().apply {
                    set(year, month, day, 0, 0, 0)
                }
                val today = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                val diffMillis = today.timeInMillis - keberangkatanCalendar.timeInMillis
                val diffDays = (diffMillis / (1000 * 60 * 60 * 24)).toInt()
                return "$diffDays hari"
            }
        } catch (e: Exception) {
            Log.e("ProfileActivity", "Error calculating sailing duration: ${e.message}")
        }
        return "Belum berlayar"
    }

    private fun formatTanggal(tanggal: String): String {
        if (tanggal.isEmpty()) return ""

        // Handle YYYY-MM-DD format (from database)
        if (tanggal.contains("-")) {
            val parts = tanggal.split("-")
            if (parts.size == 3) {
                val year = parts[0]
                val monthNum = parts[1].toIntOrNull() ?: 1
                val day = parts[2]
                val monthNames = arrayOf("Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember")
                val month = if (monthNum in 1..12) monthNames[monthNum - 1] else "Invalid"
                return "$day $month $year"
            }
        }

        // Handle DD/MM/YYYY format (existing format)
        val parts = tanggal.split("/")
        if (parts.size == 3) {
            val day = parts[0]
            val monthNum = parts[1].toIntOrNull() ?: 1
            val year = parts[2]
            val monthNames = arrayOf("Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember")
            val month = if (monthNum in 1..12) monthNames[monthNum - 1] else "Invalid"
            return "$day $month $year"
        }
        return tanggal
    }

    private fun getMonthName(month: Int): String {
        val months = arrayOf("januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember")
        return months[month]
    }
}