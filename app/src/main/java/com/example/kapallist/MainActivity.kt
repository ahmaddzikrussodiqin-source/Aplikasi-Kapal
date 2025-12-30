package com.example.kapallist

import android.app.AlertDialog
import android.content.DialogInterface
import android.widget.ListView
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.launch
import com.example.kapallist.User
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {
    private lateinit var database: KapalDatabase
    private lateinit var ivUserPhoto: ImageView
    private lateinit var tvUserName: TextView
    private var currentDialogImageView: ImageView? = null  // Untuk update foto di dialog
    private lateinit var token: String

    // Activity Result Launcher untuk galeri - initialize early
    private lateinit var galleryLauncher: ActivityResultLauncher<Intent>

    // Tambahkan method untuk copy gambar ke internal storage (fallback untuk versi lama)
    private fun copyImageToInternalStorage(uri: Uri): String? {
        return try {
            val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val source = ImageDecoder.createSource(contentResolver, uri)
                ImageDecoder.decodeBitmap(source)
            } else {
                MediaStore.Images.Media.getBitmap(contentResolver, uri)  // Fallback untuk API < 28
            }
            val file = File(filesDir, "profile_${System.currentTimeMillis()}.jpg")
            FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 100, out)
            }
            file.absolutePath
        } catch (e: Exception) {
            Log.e("MainActivity", "Error copying image: ${e.message}")
            null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d("MainActivity", "onCreate started")  // Tambahkan log di awal
        supportActionBar?.hide()  // Sembunyikan ActionBar

        database = KapalDatabase.getDatabase(this)

        // Initialize views early for gallery launcher callback
        setContentView(R.layout.activity_main)
        ivUserPhoto = findViewById(R.id.iv_user_photo)

        // Initialize Activity Result Launcher early (before version check)
        galleryLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == RESULT_OK) {
                val selectedImageUri = result.data?.data
                if (selectedImageUri != null) {
                    // Copy gambar ke internal storage
                    val internalPath = copyImageToInternalStorage(selectedImageUri)
                    if (internalPath != null) {
                        // Update UI di MainActivity
                        ivUserPhoto.setImageURI(Uri.fromFile(File(internalPath)))
                        // Update UI di dialog jika masih terbuka
                        currentDialogImageView?.setImageURI(Uri.fromFile(File(internalPath)))
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        try {
                            val editor = sharedPref.edit()
                            editor.putString("photo_uri", internalPath)  // Simpan path internal
                            editor.apply()
                        } catch (e: Exception) {
                            Log.e("MainActivity", "Error saving photo_uri: ${e.message}")
                        }

                        // Note: Photo is stored locally, no need to update server

                        Toast.makeText(this, "Foto profil berhasil diganti", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this, "Gagal menyimpan foto", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        // Check app version first
        checkAppVersion()

        // Check if user is logged in
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val isLoggedIn = sharedPref.getBoolean("is_logged_in", false)
        if (!isLoggedIn) {
            // Redirect to LoginActivity if not logged in
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
            return
        }

        setContentView(R.layout.activity_main)

        // Get token from SharedPreferences
        token = sharedPref.getString("token", "") ?: ""

        // Inisialisasi Activity Result Launcher untuk galeri
        galleryLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == RESULT_OK) {
                val selectedImageUri = result.data?.data
                if (selectedImageUri != null) {
                    // Copy gambar ke internal storage
                    val internalPath = copyImageToInternalStorage(selectedImageUri)
                    if (internalPath != null) {
                        // Update UI di MainActivity
                        ivUserPhoto.setImageURI(Uri.fromFile(File(internalPath)))
                        // Update UI di dialog jika masih terbuka
                        currentDialogImageView?.setImageURI(Uri.fromFile(File(internalPath)))
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        try {
                            val editor = sharedPref.edit()
                            editor.putString("photo_uri", internalPath)  // Simpan path internal
                            editor.apply()
                        } catch (e: Exception) {
                            Log.e("MainActivity", "Error saving photo_uri: ${e.message}")
                        }

                        // Note: Photo is stored locally, no need to update server

                        Toast.makeText(this, "Foto profil berhasil diganti", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this, "Gagal menyimpan foto", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        // Load user data from SharedPreferences (since we have token, user data should be available)
        val userId = sharedPref.getString("user_id", "") ?: ""
        val userRole = sharedPref.getString("role", "Member") ?: "Member"
        val userName = userId

        Log.d("MainActivity", "userId: $userId, userRole: $userRole")

        // Kontrol akses berdasarkan role
        val btnInput = findViewById<Button>(R.id.btn_input_status)
        val btnProfile = findViewById<Button>(R.id.btn_view_profile)
        val btnDokumen = findViewById<Button>(R.id.btn_dokumen_kapal)
        val btnDaftarKapal = findViewById<Button>(R.id.btn_daftar_kapal)  // Tambah tombol baru

        when (userRole) {
            "Moderator" -> {
                // Akses penuh
                btnInput.isEnabled = true
                btnProfile.isEnabled = true
                btnDokumen.isEnabled = true
                btnDaftarKapal.isEnabled = true  // Enable tombol baru
                // Tampilkan fitur buat akun dan manage users
                showCreateAccountButton()
                showManageUsersButton()
            }
            "Supervisi" -> {
                // Akses ke Input dan Profile
                btnInput.isEnabled = true
                btnProfile.isEnabled = true
                btnDokumen.isEnabled = false
                btnDokumen.alpha = 0.5f  // Visual hint disabled
                btnDaftarKapal.isEnabled = true  // Enable tombol baru
            }
            "Member" -> {
                // Akses ke Input dan Profile
                btnInput.isEnabled = true
                btnProfile.isEnabled = true
                btnDokumen.isEnabled = false
                btnDokumen.alpha = 0.5f
                btnDaftarKapal.isEnabled = true  // Enable tombol baru
            }
        }

        btnInput.setOnClickListener {
            val intent = Intent(this@MainActivity, InputActivity::class.java)
            startActivity(intent)
        }

        btnProfile.setOnClickListener {
            val intent = Intent(this@MainActivity, ProfileActivity::class.java)
            startActivity(intent)
        }

        btnDokumen.setOnClickListener {
            if (btnDokumen.isEnabled) {
                val intent = Intent(this@MainActivity, DocumentActivity::class.java)
                startActivity(intent)
            } else {
                Toast.makeText(this@MainActivity, "Akses tidak diizinkan", Toast.LENGTH_SHORT).show()
            }
        }

        // Tambah onClick untuk tombol Daftar Kapal
        btnDaftarKapal.setOnClickListener {
            val intent = Intent(this@MainActivity, DaftarKapalActivity::class.java)
            startActivity(intent)
        }

        // Tampilkan nama user
        tvUserName = findViewById(R.id.tv_user_name)
        tvUserName.text = userName

        // Tampilkan foto jika ada
        ivUserPhoto = findViewById(R.id.iv_user_photo)
        val userPhotoUri = sharedPref.getString("photo_uri", null)
        if (userPhotoUri != null) {
            val file = File(userPhotoUri)
            if (file.exists()) {
                ivUserPhoto.setImageURI(Uri.fromFile(file))
            }
        }

        // Klik foto untuk buka dialog info user
        ivUserPhoto.setOnClickListener {
            showUserInfoDialog(userName, userRole)
        }

        // Set app version
        val tvAppVersion = findViewById<TextView>(R.id.tv_app_version)
        try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            tvAppVersion.text = "Version: ${packageInfo.versionName}"
        } catch (e: Exception) {
            tvAppVersion.text = "Version: 1.00.00"
        }
    }

    private fun showCreateAccountButton() {
        val btnCreateAccount = findViewById<Button>(R.id.btn_create_account)
        btnCreateAccount.visibility = View.VISIBLE
        btnCreateAccount.setOnClickListener {
            showCreateAccountDialog()
        }
    }

    private fun showManageUsersButton() {
        val btnManageUsers = findViewById<Button>(R.id.btn_manage_users)
        val cardManageUsers = findViewById<View>(R.id.card_manage_users)
        cardManageUsers.visibility = View.VISIBLE
        btnManageUsers.setOnClickListener {
            showManageUsersDialog()
        }
    }

    private fun showManageUsersDialog() {
        lifecycleScope.launch {
            try {
                val response = ApiClient.apiService.getAllUsers("Bearer $token")
                if (response.isSuccessful) {
                    val users = response.body()?.data ?: emptyList()
                    if (users.isNotEmpty()) {
                        val userInfos = users.map { user ->
                            "${user.userId}\nNama: ${user.nama ?: "Tidak ada"}\nRole: ${user.role ?: "Member"}"
                        }.toTypedArray()
                        val builder = AlertDialog.Builder(this@MainActivity)
                        builder.setTitle("Manage Users - Informasi User Terdaftar")
                        builder.setItems(userInfos) { _, which ->
                            val selectedUser = users[which]
                            showEditUserDialog(selectedUser)
                        }
                        builder.setPositiveButton("Tambah User Baru") { _, _ ->
                            showCreateAccountDialog()
                        }
                        builder.setNegativeButton("Batal", null)
                        builder.show()
                    } else {
                        showCreateAccountDialog()
                    }
                } else {
                    if (response.code() == 403) {
                        Toast.makeText(this@MainActivity, "Sesi telah berakhir, silakan login kembali", Toast.LENGTH_SHORT).show()
                        logout()
                    } else {
                        Toast.makeText(this@MainActivity, "Gagal memuat users: ${response.message()}", Toast.LENGTH_SHORT).show()
                    }
                }
            } catch (e: Exception) {
                Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showEditUserDialog(user: User) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_edit_user, null)
        val etUserId = dialogView.findViewById<EditText>(R.id.et_user_id_edit)
        val etPassword = dialogView.findViewById<EditText>(R.id.et_password_edit)
        val spinnerRole = dialogView.findViewById<Spinner>(R.id.spinner_role_edit)
        val btnUpdate = dialogView.findViewById<Button>(R.id.btn_update_user)
        val btnDelete = dialogView.findViewById<Button>(R.id.btn_delete_user)

        etUserId.setText(user.userId)
        etPassword.setText(user.password)
        val roles = arrayOf("Moderator", "Supervisi", "Member")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, roles)
        spinnerRole.adapter = adapter
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        spinnerRole.setSelection(roles.indexOf(sharedPref.getString("role", "Member")))  // Load role dari SharedPreferences

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        btnUpdate.setOnClickListener {
            val newUserId = etUserId.text.toString().trim()
            val newPassword = etPassword.text.toString().trim()
            val newRole = spinnerRole.selectedItem.toString()
            if (newUserId.isNotEmpty() && newPassword.isNotEmpty()) {
                lifecycleScope.launch {
                    try {
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@MainActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        val updatedUser = User(
                            userId = newUserId,
                            password = newPassword,
                            nama = user.nama,
                            role = newRole,
                            photoUri = user.photoUri
                        )
                        val response = ApiClient.apiService.updateUser("Bearer $token", user.userId, updatedUser)
                        if (response.isSuccessful) {
                            // Update role di SharedPreferences jika user saat ini
                            if (newUserId == sharedPref.getString("user_id", "")) {
                                val editor = sharedPref.edit()
                                editor.putString("role", newRole)
                                editor.apply()
                            }
                            Toast.makeText(this@MainActivity, "User diperbarui", Toast.LENGTH_SHORT).show()
                            dialog.dismiss()
                        } else {
                            Toast.makeText(this@MainActivity, "Gagal update user: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                Toast.makeText(this, "Isi semua field", Toast.LENGTH_SHORT).show()
            }
        }

        btnDelete.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val token = sharedPref.getString("token", "") ?: ""
                    if (token.isEmpty()) {
                        Toast.makeText(this@MainActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                        return@launch
                    }

                    val response = ApiClient.apiService.deleteUser("Bearer $token", user.userId)
                    if (response.isSuccessful) {
                        Toast.makeText(this@MainActivity, "User dihapus", Toast.LENGTH_SHORT).show()
                        dialog.dismiss()
                    } else {
                        Toast.makeText(this@MainActivity, "Gagal hapus user: ${response.message()}", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }

        dialog.show()
    }

    private fun showCreateAccountDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_create_account, null)
        val etNewUserId = dialogView.findViewById<EditText>(R.id.et_new_user_id)
        val etNewPassword = dialogView.findViewById<EditText>(R.id.et_new_password)
        val etNewNama = dialogView.findViewById<EditText>(R.id.et_new_nama)
        val spinnerNewRole = dialogView.findViewById<Spinner>(R.id.spinner_new_role)
        val btnCreate = dialogView.findViewById<Button>(R.id.btn_create)

        // Set up role spinner
        val roles = arrayOf("Moderator", "Supervisi", "Member")
        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, roles)
        spinnerNewRole.adapter = adapter
        spinnerNewRole.setSelection(2)  // Default to "Member"

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        btnCreate.setOnClickListener {
            val newUserId = etNewUserId.text.toString().trim()
            val newPassword = etNewPassword.text.toString().trim()
            val newNama = etNewNama.text.toString().trim()
            val newRole = spinnerNewRole.selectedItem.toString()

            if (newUserId.isNotEmpty() && newPassword.isNotEmpty()) {
                lifecycleScope.launch {
                    try {
                        val newUser = User(
                            userId = newUserId,
                            password = newPassword,
                            nama = if (newNama.isNotEmpty()) newNama else null,
                            role = newRole
                        )
                        val response = ApiClient.apiService.createUser("Bearer $token", newUser)
                        if (response.isSuccessful) {
                            Toast.makeText(this@MainActivity, "Akun $newUserId berhasil dibuat di Railway", Toast.LENGTH_SHORT).show()
                            dialog.dismiss()
                        } else {
                            val errorBody = response.errorBody()?.string()
                            Toast.makeText(this@MainActivity, "Gagal buat akun: ${response.message()}", Toast.LENGTH_SHORT).show()
                            Log.e("CreateUser", "Error: ${response.code()} - ${errorBody}")
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                        Log.e("CreateUser", "Exception: ${e.message}")
                    }
                }
            } else {
                Toast.makeText(this, "User ID dan Password harus diisi", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    // Method untuk dialog info user (hapus parameter photoUri)
    private fun showUserInfoDialog(name: String, role: String) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_user_info, null)
        val ivPhoto = dialogView.findViewById<ImageView>(R.id.iv_user_photo_dialog)
        val tvName = dialogView.findViewById<TextView>(R.id.tv_user_name_dialog)
        val tvRole = dialogView.findViewById<TextView>(R.id.tv_user_role_dialog)
        val btnGantiPassword = dialogView.findViewById<Button>(R.id.btn_ganti_password)
        val btnLogout = dialogView.findViewById<Button>(R.id.btn_logout)

        tvName.text = name
        tvRole.text = role

        // Load foto dari SharedPreferences saat ini
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val currentPhotoUri = try {
            sharedPref.getString("photo_uri", null)
        } catch (e: Exception) {
            Log.e("MainActivity", "Error reading photo_uri: ${e.message}")
            null
        }
        if (currentPhotoUri != null) {
            val file = File(currentPhotoUri)
            if (file.exists()) {
                ivPhoto.setImageURI(Uri.fromFile(file))
            }
        }

        // Simpan referensi ImageView dialog
        currentDialogImageView = ivPhoto

        // Tambahkan onClick untuk ganti foto (gunakan Activity Result Launcher)
        ivPhoto.setOnClickListener {
            val intent = Intent(Intent.ACTION_GET_CONTENT)
            intent.type = "image/*"
            galleryLauncher.launch(intent)  // Gunakan launcher
        }

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        btnGantiPassword.setOnClickListener {
            dialog.dismiss()
            showUbahSandiDialog()
        }

        btnLogout.setOnClickListener {
            logout()
            dialog.dismiss()
        }

        dialog.show()
    }

    // Method untuk dialog ubah sandi
    private fun showUbahSandiDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_ubah_sandi, null)
        val etSandiLama = dialogView.findViewById<EditText>(R.id.et_sandi_lama)
        val etSandiBaru = dialogView.findViewById<EditText>(R.id.et_sandi_baru)
        val btnSimpan = dialogView.findViewById<Button>(R.id.btn_simpan_sandi)

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .setCancelable(true)
            .create()

        btnSimpan.setOnClickListener {
            val sandiLama = etSandiLama.text.toString()
            val sandiBaru = etSandiBaru.text.toString()
            val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
            val currentUserId = sharedPref.getString("user_id", "") ?: ""

            if (sandiLama.isNotEmpty() && sandiBaru.isNotEmpty()) {
                lifecycleScope.launch {
                    try {
                        val token = sharedPref.getString("token", "") ?: ""
                        if (token.isEmpty()) {
                            Toast.makeText(this@MainActivity, "Token tidak ditemukan", Toast.LENGTH_SHORT).show()
                            return@launch
                        }

                        // For password change, we need to verify old password and update
                        // Since we don't have a specific endpoint, we'll use updateUser
                        val updatedUser = User(userId = currentUserId, password = sandiBaru)
                        val response = ApiClient.apiService.updateUser("Bearer $token", currentUserId, updatedUser)
                        if (response.isSuccessful) {
                            Toast.makeText(this@MainActivity, "Password berhasil diubah", Toast.LENGTH_SHORT).show()
                            dialog.dismiss()
                        } else {
                            Toast.makeText(this@MainActivity, "Gagal ubah password: ${response.message()}", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            } else {
                Toast.makeText(this@MainActivity, "Isi semua field", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    private fun checkAppVersion() {
        lifecycleScope.launch {
            try {
                Log.d("VersionCheck", "Starting version check...")
                val response = ApiClient.apiService.getVersion()
                Log.d("VersionCheck", "Response received: ${response.isSuccessful}")
                if (response.isSuccessful) {
                    val body = response.body()
                    Log.d("VersionCheck", "Response body: $body")
                    val serverVersion = body?.get("version") as? String
                    Log.d("VersionCheck", "Server version: $serverVersion")
                    if (serverVersion != null) {
                        val packageInfo = packageManager.getPackageInfo(packageName, 0)
                        val currentVersion = packageInfo.versionName
                        Log.d("VersionCheck", "Current app version: $currentVersion")
                        Log.d("VersionCheck", "Versions equal: ${serverVersion == currentVersion}")
                        if (serverVersion != currentVersion) {
                            // Version mismatch, show dialog to force update
                            Log.d("VersionCheck", "Versions don't match, showing update dialog")
                            showUpdateRequiredDialog(serverVersion, currentVersion)
                            return@launch
                        } else {
                            Log.d("VersionCheck", "Versions match, proceeding with app initialization")
                        }
                    } else {
                        // Server didn't return version, assume update required for safety
                        Log.d("VersionCheck", "Server version is null, showing update dialog")
                        showUpdateRequiredDialog("terbaru", packageManager.getPackageInfo(packageName, 0).versionName)
                        return@launch
                    }
                } else {
                    // Failed to check version, show error and close app for safety
                    Log.d("VersionCheck", "Response not successful: ${response.code()}")
                    showConnectionErrorDialog()
                    return@launch
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Error checking app version: ${e.message}")
                // Network error, show error and close app for safety
                showConnectionErrorDialog()
                return@launch
            }
            // Version check passed, continue with app initialization
            Log.d("VersionCheck", "Version check passed, calling proceedWithAppInitialization")
            proceedWithAppInitialization()
        }
    }

    private fun showConnectionErrorDialog() {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Koneksi Gagal")
        builder.setMessage("Tidak dapat memeriksa versi aplikasi. Pastikan koneksi internet aktif dan coba lagi.")
        builder.setCancelable(false)
        builder.setPositiveButton("Coba Lagi") { _, _ ->
            checkAppVersion() // Retry version check
        }
        builder.setNegativeButton("Keluar") { _, _ ->
            finish() // Close app
        }
        builder.show()
    }

    private fun proceedWithAppInitialization() {
        // Continue with the rest of onCreate logic after version check
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val isLoggedIn = sharedPref.getBoolean("is_logged_in", false)
        if (!isLoggedIn) {
            val intent = Intent(this, LoginActivity::class.java)
            startActivity(intent)
            finish()
            return
        }

        setContentView(R.layout.activity_main)

        // Get token from SharedPreferences
        token = sharedPref.getString("token", "") ?: ""

        // Inisialisasi Activity Result Launcher untuk galeri
        galleryLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == RESULT_OK) {
                val selectedImageUri = result.data?.data
                if (selectedImageUri != null) {
                    // Copy gambar ke internal storage
                    val internalPath = copyImageToInternalStorage(selectedImageUri)
                    if (internalPath != null) {
                        // Update UI di MainActivity
                        ivUserPhoto.setImageURI(Uri.fromFile(File(internalPath)))
                        // Update UI di dialog jika masih terbuka
                        currentDialogImageView?.setImageURI(Uri.fromFile(File(internalPath)))
                        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                        try {
                            val editor = sharedPref.edit()
                            editor.putString("photo_uri", internalPath)  // Simpan path internal
                            editor.apply()
                        } catch (e: Exception) {
                            Log.e("MainActivity", "Error saving photo_uri: ${e.message}")
                        }

                        // Note: Photo is stored locally, no need to update server

                        Toast.makeText(this, "Foto profil berhasil diganti", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this, "Gagal menyimpan foto", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        // Load user data from SharedPreferences (since we have token, user data should be available)
        val userId = sharedPref.getString("user_id", "") ?: ""
        val userRole = sharedPref.getString("role", "Member") ?: "Member"
        val userName = userId

        Log.d("MainActivity", "userId: $userId, userRole: $userRole")

        // Kontrol akses berdasarkan role
        val btnInput = findViewById<Button>(R.id.btn_input_status)
        val btnProfile = findViewById<Button>(R.id.btn_view_profile)
        val btnDokumen = findViewById<Button>(R.id.btn_dokumen_kapal)
        val btnDaftarKapal = findViewById<Button>(R.id.btn_daftar_kapal)  // Tambah tombol baru

        when (userRole) {
            "Moderator" -> {
                // Akses penuh
                btnInput.isEnabled = true
                btnProfile.isEnabled = true
                btnDokumen.isEnabled = true
                btnDaftarKapal.isEnabled = true  // Enable tombol baru
                // Tampilkan fitur buat akun dan manage users
                showCreateAccountButton()
                showManageUsersButton()
            }
            "Supervisi" -> {
                // Akses ke Input dan Profile
                btnInput.isEnabled = true
                btnProfile.isEnabled = true
                btnDokumen.isEnabled = false
                btnDokumen.alpha = 0.5f  // Visual hint disabled
                btnDaftarKapal.isEnabled = true  // Enable tombol baru
            }
            "Member" -> {
                // Akses ke Input dan Profile
                btnInput.isEnabled = true
                btnProfile.isEnabled = true
                btnDokumen.isEnabled = false
                btnDokumen.alpha = 0.5f
                btnDaftarKapal.isEnabled = true  // Enable tombol baru
            }
        }

        btnInput.setOnClickListener {
            val intent = Intent(this@MainActivity, InputActivity::class.java)
            startActivity(intent)
        }

        btnProfile.setOnClickListener {
            val intent = Intent(this@MainActivity, ProfileActivity::class.java)
            startActivity(intent)
        }

        btnDokumen.setOnClickListener {
            if (btnDokumen.isEnabled) {
                val intent = Intent(this@MainActivity, DocumentActivity::class.java)
                startActivity(intent)
            } else {
                Toast.makeText(this@MainActivity, "Akses tidak diizinkan", Toast.LENGTH_SHORT).show()
            }
        }

        // Tambah onClick untuk tombol Daftar Kapal
        btnDaftarKapal.setOnClickListener {
            val intent = Intent(this@MainActivity, DaftarKapalActivity::class.java)
            startActivity(intent)
        }

        // Tampilkan nama user
        tvUserName = findViewById(R.id.tv_user_name)
        tvUserName.text = userName

        // Tampilkan foto jika ada
        ivUserPhoto = findViewById(R.id.iv_user_photo)
        val userPhotoUri = sharedPref.getString("photo_uri", null)
        if (userPhotoUri != null) {
            val file = File(userPhotoUri)
            if (file.exists()) {
                ivUserPhoto.setImageURI(Uri.fromFile(file))
            }
        }

        // Klik foto untuk buka dialog info user
        ivUserPhoto.setOnClickListener {
            showUserInfoDialog(userName, userRole)
        }

        // Set app version
        val tvAppVersion = findViewById<TextView>(R.id.tv_app_version)
        try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            tvAppVersion.text = "Version: ${packageInfo.versionName}"
        } catch (e: Exception) {
            tvAppVersion.text = "Version: 1.00.00"
        }
    }

    private fun showUpdateRequiredDialog(serverVersion: String, currentVersion: String?) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Update Diperlukan")
        builder.setMessage("Versi aplikasi Anda (${currentVersion ?: "tidak diketahui"}) sudah lama. Versi terbaru adalah $serverVersion. Silakan update aplikasi untuk melanjutkan.")
        builder.setCancelable(false) // Prevent dismissing
        builder.setPositiveButton("Update Sekarang") { _, _ ->
            // Open Play Store or app store link
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName")))
            } catch (e: Exception) {
                // Fallback to browser
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$packageName")))
            }
            finish() // Close app
        }
        builder.setNegativeButton("Keluar") { _, _ ->
            finish() // Close app
        }
        builder.show()
    }

    private fun logout() {
        // Clear status login
        val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
        val editor = sharedPref.edit()
        editor.clear()  // Clear semua data login
        editor.apply()

        // Redirect ke LoginActivity
        val intent = Intent(this, LoginActivity::class.java)
        startActivity(intent)
        finish()  // Tutup MainActivity
    }

    private fun showDaftarKapalDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_daftar_kapal, null)
        val etNamaKapal = dialogView.findViewById<EditText>(R.id.et_nama_kapal_daftar)
        val btnTambah = dialogView.findViewById<Button>(R.id.btn_tambah_kapal_daftar)
        val lvListKapal = dialogView.findViewById<ListView>(R.id.lv_list_kapal_daftar)  // Ganti RecyclerView dengan ListView

        val listNamaKapal = mutableListOf<String>()  // Temporary list, atau load dari database
        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, listNamaKapal)
        lvListKapal.adapter = adapter  // Sekarang cocok

        lvListKapal.setOnItemClickListener { _, _, position, _ ->  // Sekarang resolved
            val namaKapal = listNamaKapal[position]
            showDetailKapalDialog(namaKapal)  // Tampilkan detail
        }

        btnTambah.setOnClickListener {
            val nama = etNamaKapal.text.toString()
            if (nama.isNotEmpty()) {
                listNamaKapal.add(nama)
                adapter.notifyDataSetChanged()
                etNamaKapal.text.clear()
                // Simpan ke database jika perlu
            } else {
                Toast.makeText(this, "Nama kapal harus diisi", Toast.LENGTH_SHORT).show()
            }
        }

        AlertDialog.Builder(this)
            .setView(dialogView)
            .setTitle("Daftar Kapal")
            .setNegativeButton("Tutup", null)
            .show()
    }

    private fun showDetailKapalDialog(namaKapal: String) {
        val dialogView = layoutInflater.inflate(R.layout.dialog_detail_kapal, null)
        val tvNamaPemilik = dialogView.findViewById<TextView>(R.id.tv_nama_pemilik)
        val tvTandaSelar = dialogView.findViewById<TextView>(R.id.tv_tanda_selar)
        // Tambah TextView untuk field lain: Tanda Pengenal Kapal, Berat Kotor, dll.

        // Load data dari database atau set dummy
        tvNamaPemilik.text = "Nama Pemilik Kapal: [Data dari DB]"
        tvTandaSelar.text = "Tanda Selar: [Data dari DB]"
        // Set field lain

        AlertDialog.Builder(this)
            .setView(dialogView)
            .setTitle("Detail Kapal: $namaKapal")
            .setPositiveButton("OK", null)
            .show()
    }




    // Handle hasil upload foto
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1002 && resultCode == RESULT_OK) {  // Dari MainActivity
            val selectedImageUri = data?.data
            if (selectedImageUri != null) {
                // Copy gambar ke internal storage
                val internalPath = copyImageToInternalStorage(selectedImageUri)
                if (internalPath != null) {
                    ivUserPhoto.setImageURI(Uri.fromFile(File(internalPath)))
                    val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                    try {
                        val editor = sharedPref.edit()
                        editor.putString("photo_uri", internalPath)  // Simpan path internal
                        editor.apply()
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error saving photo_uri: ${e.message}")
                    }

                    val userId = try {
                        sharedPref.getString("user_id", "") ?: ""
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error reading user_id in photo upload: ${e.message}")
                        ""
                    }
                    lifecycleScope.launch {
                        val user = database.userDao().getUser(userId)
                        if (user != null) {
                            val updatedUser = user.copy(photoUri = internalPath)
                            database.userDao().updateUser(updatedUser)
                        }
                    }

                    Toast.makeText(this, "Foto berhasil diupload", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Gagal menyimpan foto", Toast.LENGTH_SHORT).show()
                }
            }
        } else if (requestCode == 1003 && resultCode == RESULT_OK) {  // Dari dialog
            val selectedImageUri = data?.data
            if (selectedImageUri != null) {
                // Copy gambar ke internal storage
                val internalPath = copyImageToInternalStorage(selectedImageUri)
                if (internalPath != null) {
                    ivUserPhoto.setImageURI(Uri.fromFile(File(internalPath)))
                    val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                    try {
                        val editor = sharedPref.edit()
                        editor.putString("photo_uri", internalPath)  // Simpan path internal
                        editor.apply()
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error saving photo_uri: ${e.message}")
                    }

                    val userId = try {
                        sharedPref.getString("user_id", "") ?: ""
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error reading user_id in photo upload: ${e.message}")
                        ""
                    }
                    lifecycleScope.launch {
                        val user = database.userDao().getUser(userId)
                        if (user != null) {
                            val updatedUser = user.copy(photoUri = internalPath)
                            database.userDao().updateUser(updatedUser)
                        }
                    }

                    Toast.makeText(this, "Foto berhasil diupload", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Gagal menyimpan foto", Toast.LENGTH_SHORT).show()
                }
            }
        } else if (requestCode == 1003 && resultCode == RESULT_OK) {  // Dari dialog
            val selectedImageUri = data?.data
            if (selectedImageUri != null) {
                // Copy gambar ke internal storage
                val internalPath = copyImageToInternalStorage(selectedImageUri)
                if (internalPath != null) {
                    // Update UI di MainActivity
                    ivUserPhoto.setImageURI(Uri.fromFile(File(internalPath)))
                    // Update UI di dialog jika masih terbuka
                    currentDialogImageView?.setImageURI(Uri.fromFile(File(internalPath)))
                    val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                    val editor = sharedPref.edit()
                    editor.putString("photo_uri", internalPath)  // Simpan path internal
                    editor.apply()

                    // Update database
                    val userId = sharedPref.getString("user_id", "") ?: ""
                    lifecycleScope.launch {
                        val user = database.userDao().getUser(userId)
                        if (user != null) {
                            val updatedUser = user.copy(photoUri = internalPath)
                            database.userDao().updateUser(updatedUser)
                        }
                    }

                    Toast.makeText(this, "Foto profil berhasil diganti", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Gagal menyimpan foto", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
