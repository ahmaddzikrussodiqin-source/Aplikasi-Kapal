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
import android.widget.AdapterView
import android.widget.Button
import android.widget.CheckBox
import android.widget.CompoundButton
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import android.widget.ArrayAdapter
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.example.kapallist.KapalEntity
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
    private val listAllKapal = mutableListOf<Kapal>()
    private lateinit var userRole: String
    private var isProgrammaticChange = false
    private lateinit var socket: Socket
    private var currentFilterText = ""
    private var currentOwnerFilter = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_profile)

        val etFilter = findViewById<EditText>(R.id.et_filter_persiapan)
        etFilter.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                currentFilterText = s.toString().trim()
                applyFilter()
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        val spinnerOwner = findViewById<Spinner>(R.id.spinner_filter_owner)
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

        val btnBack = findViewById<FloatingActionButton>(R.id.btn_back)
        btnBack.setOnClickListener {
            finish()
        }
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        userRole = sharedPref.getString("role", "Member") ?: "Member"

        val token = sharedPref.getString("token", "") ?: ""
        if (token.isNotEmpty()) {
            try {
                val opts = IO.Options()
                opts.auth = mapOf("token" to token)
                socket = IO.socket(Config.BASE_URL, opts)
                socket.connect()
                socket.on(Socket.EVENT_CONNECT) { Log.d("Socket", "Connected") }
                socket.on(Socket.EVENT_DISCONNECT) { Log.d("Socket", "Disconnected") }
                socket.on("checklist-updated") { args ->
                    runOnUiThread {
                        val data = args[0] as JSONObject
                        val kapalId = data.getInt("kapalId")
                        val checklistStates = Gson().fromJson(data.getJSONObject("checklistStates").toString(), Map::class.java) as Map<String, Boolean>
                        val checklistDates = Gson().fromJson(data.getJSONObject("checklistDates").toString(), Map::class.java) as Map<String, String>
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

                val kapalMasukResponse = ApiClient.apiService.getAllKapalMasuk("Bearer $token")
                if (kapalMasukResponse.isSuccessful) {
                    val apiResponse = kapalMasukResponse.body()
                    if (apiResponse != null) {
                        val kapalMasukList = apiResponse.data ?: emptyList()
                        listKapal.clear()
                        listAllKapal.clear()
                        listKapal.addAll(kapalMasukList.map { Kapal(it) })
                        listAllKapal.addAll(listKapal)
                        runOnUiThread {
                            setupOwnerSpinner(listAllKapal)
                            applyFilter()
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("ProfileActivity", "Error: ${e.message}")
            }
        }
    }

    private fun setupOwnerSpinner(kapalList: List<Kapal>) {
        val spinnerOwner = findViewById<Spinner>(R.id.spinner_filter_owner)
        val ownerList = mutableListOf("Semua")
        val owners = kapalList.mapNotNull { it.namaPemilik }.distinct()
        ownerList.addAll(owners)
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, ownerList)
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerOwner.adapter = adapter
    }

    private fun buildUI(llChecklist: LinearLayout, kapalList: List<Kapal>) {
        llChecklist.removeAllViews()
        for (kapal in kapalList) {
            val tvKapal = TextView(this)
            tvKapal.text = kapal.nama ?: "Unknown"
            tvKapal.textSize = 18f
            llChecklist.addView(tvKapal)

            val items = kapal.listPersiapan
            for (item in items) {
                val checkBox = CheckBox(this)
                checkBox.text = item
                llChecklist.addView(checkBox)
            }

            val separator = View(this)
            separator.layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1)
            separator.setBackgroundColor(ContextCompat.getColor(this, android.R.color.darker_gray))
            llChecklist.addView(separator)
        }
    }

    private fun applyFilter() {
        val llChecklist = findViewById<LinearLayout>(R.id.ll_checklist)
        buildUI(llChecklist, listKapal)
    }

    private fun updateChecklistForKapal(kapalId: Int, states: Map<String, Boolean>, dates: Map<String, String>) {
        // Simplified
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::socket.isInitialized) {
            socket.disconnect()
        }
    }
}
