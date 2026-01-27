package com.example.kapallist

import android.app.AlertDialog
import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import com.google.android.material.floatingactionbutton.FloatingActionButton
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.CompoundButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date

class ProfileActivity : AppCompatActivity() {
    private val checkBoxStates = mutableMapOf<String, Boolean>()
    private val checkBoxDates = mutableMapOf<String, String>()
    private val listKapal = mutableListOf<Kapal>()
    private lateinit var userRole: String
    private var isProgrammaticChange = false
    private lateinit var socket: Socket
    private var currentFilterText = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_profile)

        // Setup filter
        val etFilter = findViewById<EditText>(R.id.et_filter_persiapan)
        etFilter.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                currentFilterText = s.toString().trim()
                applyFilter()
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        val btnBack = findViewById<FloatingActionButton>(R.id.btn_back)
        btnBack.setOnClickListener {
            finish()
        }
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        userRole = sharedPref.getString("role", "Member") ?: "Member"  // Load role

        // Initialize Socket.io
        val token = sharedPref.getString("token", "") ?: ""
        if (token.isNotEmpty()) {
            try {
                val opts = IO.Options()
                opts.auth = mapOf("token" to token)
                socket = IO.socket(Config.BASE_URL, opts)
                socket.connect()

                socket.on(Socket.EVENT_CONNECT) {
                    Log.d("Socket", "Connected")
                }

                socket.on(Socket.EVENT_DISCONNECT) {
                    Log.d("Socket", "Disconnected")
                }

                socket.on("checklist-updated") { args ->
                    runOnUiThread {
                        val data = args[0] as JSONObject
                        val kapalId = data.getInt("kapalId")
                        val checklistStates = Gson().fromJson(data.getJSONObject("checklistStates").toString(), Map::class.java) as Map<String, Boolean>
                        val checklistDates = Gson().fromJson(data.getJSONObject("checklistDates").toString(), Map::class.java) as Map<String, String>
                        // Update local data and refresh UI
                        updateChecklistForKapal(kapalId, checklistStates, checklistDates)
                    }
                }
            } catch (e: Exception) {
                Log.e("Socket", "Error initializing socket: ${e.message}")
            }
        }

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
                    val apiResponse = try { response.body() } catch (e: Exception) { null }
                    if (apiResponse != null) {
                        val kapalMasukList = apiResponse.data ?: emptyList()
                        Log.d("ProfileActivity", "Received kapal masuk data: ${kapalMasukList.size} items")
                        kapalMasukList.forEach { kapalMasuk ->
                            Log.d("ProfileActivity", "Kapal: ${kapalMasuk.nama}, tanggalKeberangkatan: ${kapalMasuk.tanggalKeberangkatan}, perkiraanKeberangkatan: ${kapalMasuk.perkiraanKeberangkatan}")
                        }
                        listKapal.clear()
                        // Convert KapalMasukEntity to Kapal
                        listKapal.addAll(kapalMasukList.map { kapalMasukEntity ->
                            Kapal(kapalMasukEntity)
                        })
                        listKapal.forEach { kapal ->
                            Log.d("ProfileActivity", "Converted Kapal: ${kapal.nama}, perkiraanKeberangkatan: ${kapal.perkiraanKeberangkatan}")
                        }
                        runOnUiThread {
                            applyFilter()
                            // Join checklist rooms for each kapal
                            if (::socket.isInitialized && socket.connected()) {
                                listKapal.forEach { kapal ->
                                    socket.emit("join-checklist", kapal.id)
                                }
                            }
                        }
                    } else {
                        Toast.makeText(this@ProfileActivity, "Gagal memuat data kapal masuk", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(this@ProfileActivity, "Gagal memuat data kapal masuk: ${response.message()}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Log.e("ProfileActivity", "Error: ${e.message}")
            }
        }
    }

    private fun buildUI(llChecklist: LinearLayout, kapalList: MutableList<Kapal>) {
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

        if (kapalList.isNotEmpty()) {
            for (kapal in kapalList) {
                // Create a vertical layout for ship name and departure date
                val shipInfoLayout = LinearLayout(this)
                shipInfoLayout.orientation = LinearLayout.VERTICAL
                shipInfoLayout.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                shipInfoLayout.setPadding(0, 16, 0, 8)

                // Add berthing duration above ship name if return date is set and departure is not
                if (!kapal.tanggalKembali.isNullOrEmpty() && kapal.perkiraanKeberangkatan.isNullOrEmpty()) {
                    val tvDurasiBerlabuh = TextView(this)
                    tvDurasiBerlabuh.text = "Durasi Berlabuh: ${hitungDurasiBerlabuh(kapal.tanggalKembali)}"
                    tvDurasiBerlabuh.textSize = 14f
                    tvDurasiBerlabuh.setTextColor(ContextCompat.getColor(this, R.color.primary))
                    tvDurasiBerlabuh.layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    shipInfoLayout.addView(tvDurasiBerlabuh)
                }

                // Add sailing duration above ship name if departure date is set
                if (!kapal.perkiraanKeberangkatan.isNullOrEmpty()) {
                    val tvDurasiBerlayar = TextView(this)
                    tvDurasiBerlayar.text = "Durasi Berlayar: ${hitungDurasiBerlayar(kapal.perkiraanKeberangkatan)}"
                    tvDurasiBerlayar.textSize = 14f
                    tvDurasiBerlayar.setTextColor(ContextCompat.getColor(this, R.color.primary))
                    tvDurasiBerlayar.layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    shipInfoLayout.addView(tvDurasiBerlayar)
                }

                val tvKapal = TextView(this)
                val formattedKembali = if (kapal.tanggalKembali.isNullOrEmpty()) "Belum ditentukan" else formatTanggal(kapal.tanggalKembali!!)
                val namaKapal = kapal.nama ?: ""
                tvKapal.text = "Nama: $namaKapal"
                tvKapal.textSize = 16f
                tvKapal.layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                shipInfoLayout.addView(tvKapal)

                val tvKembali = TextView(this)
                tvKembali.text = "Kembali: $formattedKembali"
                tvKembali.textSize = 14f
                tvKembali.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
                tvKembali.layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                shipInfoLayout.addView(tvKembali)

                // Add departure date under the ship name always
                val tvDeparture = TextView(this)
                val formattedDeparture = if (kapal.perkiraanKeberangkatan.isNullOrEmpty()) "Belum ditentukan" else formatTanggal(kapal.perkiraanKeberangkatan!!)
                tvDeparture.text = "Tanggal Keberangkatan: $formattedDeparture"
                tvDeparture.textSize = 14f
                tvDeparture.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
                tvDeparture.layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
                shipInfoLayout.addView(tvDeparture)



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

                val items = kapal.listPersiapan
                Log.d("ProfileActivity", "Checklist items for ${kapal.nama}: $items")

                val btnFinish = Button(this)
                btnFinish.text = if (kapal.isFinished) "Batal" else "Finish"  // Ubah teks berdasarkan status
                btnFinish.setBackgroundResource(R.drawable.button_rounded)
                btnFinish.setTextColor(android.graphics.Color.WHITE)
                btnFinish.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                val allCheckedInitial = items.all { kapal.checklistStates[it] == true }
                btnFinish.isEnabled = if (kapal.isFinished) true else allCheckedInitial
                btnFinish.alpha = 1.0f

                for (item in items) {
                    if (item.isNotEmpty()) {
                        val itemLayout = LinearLayout(this)
                        itemLayout.orientation = LinearLayout.HORIZONTAL
                        itemLayout.layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        )

                        val checkBox = CheckBox(this)
                        checkBox.isChecked = kapal.checklistStates[item] ?: false
                        checkBox.isEnabled = !kapal.isFinished || (kapal.checklistStates[item] == false)
                        if (checkBox.isChecked) {
                            checkBox.paintFlags = checkBox.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                        }
                        checkBox.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)

                        val tvItem = TextView(this)
                        tvItem.text = item
                        tvItem.setTextColor(android.graphics.Color.BLACK)
                        tvItem.textSize = 16f
                        tvItem.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 2f)
                        if (kapal.isFinished) {
                            tvItem.setOnClickListener {
                                // Show edit dialog
                                val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                                val input = EditText(this@ProfileActivity)
                                input.setText(item)
                                alertDialog.setView(input)
                                alertDialog.setTitle("Edit Kebutuhan")
                                alertDialog.setPositiveButton("Simpan") { _, _ ->
                                    val newItem = input.text.toString().trim()
                                    if (newItem.isNotEmpty() && newItem != item) {
                                        // Replace in listPersiapan
                                        val updatedList = kapal.listPersiapan.toMutableList()
                                        val index = updatedList.indexOf(item)
                                        if (index != -1) {
                                            updatedList[index] = newItem
                                        }
                                        val updatedChecklistStates = kapal.checklistStates.toMutableMap()
                                        val updatedChecklistDates = kapal.checklistDates.toMutableMap()
                                        // Move state and date to new key
                                        updatedChecklistStates[newItem] = updatedChecklistStates.remove(item) ?: false
                                        updatedChecklistDates[newItem] = updatedChecklistDates.remove(item) ?: ""
                                        val updatedKapal = kapal.copy(
                                            listPersiapan = updatedList,
                                            checklistStates = updatedChecklistStates,
                                            checklistDates = updatedChecklistDates
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

                                                val response = ApiClient.apiService.updateKapalMasuk("Bearer $token", kapal.id, updatedKapal.toKapalMasukEntity())
                                                if (response.isSuccessful) {
                                                    loadDataAndBuildUI()  // Reload UI
                                                    Toast.makeText(this@ProfileActivity, "Kebutuhan berhasil diedit", Toast.LENGTH_SHORT).show()
                                                } else {
                                                    Toast.makeText(this@ProfileActivity, "Gagal mengedit kebutuhan: ${response.message()}", Toast.LENGTH_SHORT).show()
                                                }
                                            } catch (e: Exception) {
                                                Log.e("ProfileActivity", "Error: ${e.message}")
                                            }
                                        }
                                    } else if (newItem == item) {
                                        // No change
                                    } else {
                                        Toast.makeText(this@ProfileActivity, "Kebutuhan tidak boleh kosong", Toast.LENGTH_SHORT).show()
                                    }
                                }
                                alertDialog.setNegativeButton("Batal", null)
                                alertDialog.show()
                            }
                        }

                        val tvDate = TextView(this)
                        tvDate.text = kapal.checklistDates[item] ?: ""
                        tvDate.setTextColor(android.graphics.Color.BLACK)
                        tvDate.textSize = 12f
                        tvDate.layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply { gravity = android.view.Gravity.END }

                        itemLayout.addView(checkBox)
                        itemLayout.addView(tvItem)
                        itemLayout.addView(tvDate)

                        var checkBoxListener: CompoundButton.OnCheckedChangeListener? = null
                        checkBoxListener = CompoundButton.OnCheckedChangeListener { _, isChecked ->
                            if (!kapal.isFinished || (kapal.isFinished && kapal.checklistStates[item] == false)) {
                                if (isChecked) {
                                    // Show confirmation dialog for checking
                                    val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                                    alertDialog.setMessage("Yakin ingin menyelesaikan ?")
                                    alertDialog.setPositiveButton("Yakin") { _, _ ->
                                        // Show DatePickerDialog to select the date
                                        val calendar = Calendar.getInstance()
                                        val year = calendar.get(Calendar.YEAR)
                                        val month = calendar.get(Calendar.MONTH)
                                        val day = calendar.get(Calendar.DAY_OF_MONTH)
                                        val datePickerDialog = DatePickerDialog(this@ProfileActivity, { _, selectedYear, selectedMonth, selectedDay ->
                                            val selectedDate = String.format("%02d/%02d/%04d", selectedDay, selectedMonth + 1, selectedYear)
                                            kapal.checklistStates[item] = true
                                            kapal.checklistDates[item] = selectedDate
                                            tvDate.text = selectedDate
                                            checkBox.paintFlags = checkBox.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG

                                            // Emit to Socket.io
                                            if (::socket.isInitialized && socket.connected()) {
                                                val data = JSONObject().apply {
                                                    put("kapalId", kapal.id)
                                                    put("item", item)
                                                    put("checked", true)
                                                    put("date", selectedDate)
                                                }
                                                socket.emit("update-checklist", data)
                                            }

                                            val allCheckedNow = items.all { kapal.checklistStates[it] == true }
                                            btnFinish.isEnabled = if (kapal.isFinished) true else allCheckedNow
                                        }, year, month, day)
                                        datePickerDialog.setTitle("Pilih Tanggal Checklist")
                                        datePickerDialog.show()
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
                                        kapal.checklistStates[item] = false
                                        kapal.checklistDates.remove(item)
                                        tvDate.text = ""
                                        checkBox.paintFlags = checkBox.paintFlags and android.graphics.Paint.STRIKE_THRU_TEXT_FLAG.inv()

                                        // Emit to Socket.io
                                        if (::socket.isInitialized && socket.connected()) {
                                            val data = JSONObject().apply {
                                                put("kapalId", kapal.id)
                                                put("item", item)
                                                put("checked", false)
                                                put("date", "")
                                            }
                                            socket.emit("update-checklist", data)
                                        }

                                        val allCheckedNow = items.all { kapal.checklistStates[it] == true }
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
                btnEdit.text = if (kapal.isFinished) "Tambah Kebutuhan" else "Edit"
                btnEdit.setBackgroundResource(R.drawable.button_rounded)
                btnEdit.setTextColor(android.graphics.Color.WHITE)
                btnEdit.layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                // Enable/disable berdasarkan status
                btnEdit.isEnabled = true
                btnEdit.alpha = 1.0f
                btnEdit.setOnClickListener {
                    if (!kapal.isFinished) {
                        val intent = Intent(this@ProfileActivity, InputActivity::class.java)
                        intent.putExtra("edit_mode", true)
                        intent.putExtra("kapal_id", kapal.id)
                        startActivity(intent)
                    } else {
                        // Show dialog to add new persiapan item
                        val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                        val input = EditText(this@ProfileActivity)
                        input.hint = "Masukkan kebutuhan baru"
                        alertDialog.setView(input)
                        alertDialog.setTitle("Tambah Kebutuhan")
                        alertDialog.setPositiveButton("Tambah") { _, _ ->
                            val newItem = input.text.toString().trim()
                            if (newItem.isNotEmpty()) {
                                // Add new item to listPersiapan
                                val updatedList = kapal.listPersiapan.toMutableList()
                                updatedList.add(newItem)
                                val updatedChecklistStates = kapal.checklistStates.toMutableMap()
                                val updatedChecklistDates = kapal.checklistDates.toMutableMap()
                                // Initialize checklistStates and checklistDates for new item
                                updatedChecklistStates[newItem] = false
                                updatedChecklistDates[newItem] = ""
                                val updatedKapal = kapal.copy(
                                    listPersiapan = updatedList,
                                    checklistStates = updatedChecklistStates,
                                    checklistDates = updatedChecklistDates
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

                                        val response = ApiClient.apiService.updateKapalMasuk("Bearer $token", kapal.id, updatedKapal.toKapalMasukEntity())
                                        if (response.isSuccessful) {
                                            loadDataAndBuildUI()  // Reload UI
                                            Toast.makeText(this@ProfileActivity, "Kebutuhan berhasil ditambahkan", Toast.LENGTH_SHORT).show()
                                        } else {
                                            Toast.makeText(this@ProfileActivity, "Gagal menambahkan kebutuhan: ${response.message()}", Toast.LENGTH_SHORT).show()
                                        }
                                    } catch (e: Exception) {
                                        Log.e("ProfileActivity", "Error: ${e.message}")
                                    }
                                }
                            } else {
                                Toast.makeText(this@ProfileActivity, "Kebutuhan tidak boleh kosong", Toast.LENGTH_SHORT).show()
                            }
                        }
                        alertDialog.setNegativeButton("Batal", null)
                        alertDialog.show()
                    }
                }
                buttonLayout.addView(btnEdit)

                btnFinish.setOnClickListener {
                    if (kapal.isFinished) {
                        // Undo finish untuk semua role
                        // Show confirmation dialog for undo
                        val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                        alertDialog.setMessage("Yakin ingin membatalkan proses finish?")
                        alertDialog.setPositiveButton("Ya") { _, _ ->
                            val updatedKapal = kapal.copy(
                                isFinished = false,
                                perkiraanKeberangkatan = null,
                                durasiSelesaiPersiapan = null,
                                durasiBerlayar = null
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

                                    Log.d("ProfileActivity", "Undoing finish for kapal id: ${kapal.id}, updatedKapal: $updatedKapal")
                                    val response = ApiClient.apiService.updateKapalMasuk("Bearer $token", kapal.id, updatedKapal.toKapalMasukEntity())
                                    Log.d("ProfileActivity", "Response code: ${response.code()}, message: ${response.message()}")
                                    if (response.isSuccessful) {
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
                                    Log.e("ProfileActivity", "Error: ${e.message}")
                                }
                            }
                        }
                        alertDialog.setNegativeButton("Tidak") { _, _ ->
                            // Do nothing, just dismiss the dialog
                        }
                        alertDialog.setCancelable(true)
                        alertDialog.show()
                    } else {
                        // Kode finish asli
                        val allChecked = items.all { kapal.checklistStates[it] == true }
                        if (allChecked) {
                            val alertDialog = AlertDialog.Builder(this@ProfileActivity)
                            alertDialog.setMessage("Tentukan tanggal keberangkatan kapal")
                            alertDialog.setPositiveButton("OK") { _, _ ->
                                val calendar = Calendar.getInstance()
                                val year = calendar.get(Calendar.YEAR)
                                val month = calendar.get(Calendar.MONTH)
                                val day = calendar.get(Calendar.DAY_OF_MONTH)
                                val datePickerDialog = DatePickerDialog(this@ProfileActivity, { _, selectedYear, selectedMonth, selectedDay ->
                                    val selectedDate = String.format("%04d-%02d-%02d", selectedYear, selectedMonth + 1, selectedDay)
                                    val tanggalSelesaiMillis = Calendar.getInstance().apply {
                                        set(selectedYear, selectedMonth, selectedDay, 0, 0, 0)
                                    }.timeInMillis
                                    val durasi = hitungDurasiSelesaiPersiapan(kapal.tanggalKembali, tanggalSelesaiMillis)
                                    val durasiBerlayar = hitungDurasiBerlayar(selectedDate)
                                    val updatedKapal = kapal.copy(
                                        isFinished = true,
                                        tanggalBerangkat = selectedDate,
                                        perkiraanKeberangkatan = selectedDate,
                                        durasiSelesaiPersiapan = durasi,
                                        durasiBerlayar = durasiBerlayar
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
                                                loadDataAndBuildUI()
                                                Toast.makeText(this@ProfileActivity, "Kapal selesai!", Toast.LENGTH_SHORT).show()
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
                                datePickerDialog.setTitle("Pilih Tanggal Keberangkatan")
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
            // Handle YYYY-MM-DD format (ISO_LOCAL_DATE)
            if (perkiraanKeberangkatan.contains("-")) {
                val parts = perkiraanKeberangkatan.split("-")
                if (parts.size == 3) {
                    val year = parts[0].toInt()
                    val month = parts[1].toInt() - 1 // Calendar months are 0-based
                    val day = parts[2].toInt()

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
                    return if (diffDays < 0) "Belum berlayar" else "${diffDays + 1} hari"
                }
            }

            // Fallback for old format (DD Month YYYY)
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

    private fun hitungDurasiBerlabuh(tanggalKembali: String?): String {
        if (tanggalKembali.isNullOrEmpty()) return "Belum berlabuh"
        try {
            // Handle YYYY-MM-DD format (ISO_LOCAL_DATE)
            if (tanggalKembali.contains("-")) {
                val parts = tanggalKembali.split("-")
                if (parts.size == 3) {
                    val year = parts[0].toInt()
                    val month = parts[1].toInt() - 1 // Calendar months are 0-based
                    val day = parts[2].toInt()

                    val kembaliCalendar = Calendar.getInstance().apply {
                        set(year, month, day, 0, 0, 0)
                    }
                    val today = Calendar.getInstance().apply {
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }

                    val diffMillis = today.timeInMillis - kembaliCalendar.timeInMillis
                    val diffDays = (diffMillis / (1000 * 60 * 60 * 24)).toInt()
                    return if (diffDays < 0) "Belum berlabuh" else "${diffDays + 1} hari"
                }
            }

            // Handle DD/MM/YYYY format
            val parts = tanggalKembali.split("/")
            if (parts.size == 3) {
                val day = parts[0].toInt()
                val month = parts[1].toInt() - 1
                val year = parts[2].toInt()

                val kembaliCalendar = Calendar.getInstance().apply {
                    set(year, month, day, 0, 0, 0)
                }
                val today = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                val diffMillis = today.timeInMillis - kembaliCalendar.timeInMillis
                val diffDays = (diffMillis / (1000 * 60 * 60 * 24)).toInt()
                return if (diffDays < 0) "Belum berlabuh" else "${diffDays + 1} hari"
            }

            // Fallback for DD Month YYYY
            val parts2 = tanggalKembali.split(" ")
            if (parts2.size == 3) {
                val day = parts2[0].toInt()
                val monthName = parts2[1].lowercase()
                val year = parts2[2].toInt()
                val monthNames = arrayOf("januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember")
                val month = monthNames.indexOf(monthName)
                if (month == -1) return "Tanggal invalid"

                val kembaliCalendar = Calendar.getInstance().apply {
                    set(year, month, day, 0, 0, 0)
                }
                val today = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                val diffMillis = today.timeInMillis - kembaliCalendar.timeInMillis
                val diffDays = (diffMillis / (1000 * 60 * 60 * 24)).toInt()
                return if (diffDays < 0) "Belum berlabuh" else "${diffDays + 1} hari"
            }
        } catch (e: Exception) {
            Log.e("ProfileActivity", "Error calculating berthing duration: ${e.message}")
        }
        return "Belum berlabuh"
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

    private fun applyFilter() {
        val llChecklist = findViewById<LinearLayout>(R.id.ll_checklist)
        if (currentFilterText.isEmpty()) {
            buildUI(llChecklist, listKapal)
        } else {
            val filteredList = listKapal.filter { kapal ->
                kapal.listPersiapan.any { prep ->
                    prep.trim().contains(currentFilterText.trim(), ignoreCase = true)
                }
            }.toMutableList()
            buildUI(llChecklist, filteredList)
        }
    }

    private fun updateChecklistForKapal(kapalId: Int, newStates: Map<String, Boolean>, newDates: Map<String, String>) {
        val kapal = listKapal.find { it.id == kapalId }
        if (kapal != null) {
            kapal.checklistStates.clear()
            kapal.checklistStates.putAll(newStates)
            kapal.checklistDates.clear()
            kapal.checklistDates.putAll(newDates)
            // Refresh UI with current filter applied
            applyFilter()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::socket.isInitialized) {
            socket.disconnect()
        }
    }
}
