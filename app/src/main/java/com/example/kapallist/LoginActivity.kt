package com.example.kapallist

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    private lateinit var database: KapalDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        supportActionBar?.hide()
        setContentView(R.layout.activity_login)

        database = KapalDatabase.getDatabase(this)

        // Insert user default jika belum ada
        lifecycleScope.launch {
            val existingUser = database.userDao().getUser("Suhanda")
            if (existingUser == null) {
                val defaultUser = User(
                    userId = "Suhanda",
                    password = "TampanMaxBrukz"  // Hapus jabatan
                )
                database.userDao().insertUser(defaultUser)
            }
        }

        val etUserId = findViewById<EditText>(R.id.et_user_id)
        val etPassword = findViewById<EditText>(R.id.et_password)
        val btnLogin = findViewById<Button>(R.id.btn_login)
        val btnRegister = findViewById<Button>(R.id.btn_register)

        btnLogin.setOnClickListener {
            val userId = etUserId.text.toString().trim()
            val password = etPassword.text.toString().trim()

            lifecycleScope.launch {
                try {
                    // Call API login
                    val loginRequest = LoginRequest(userId, password)
                    val response = ApiClient.apiService.login(loginRequest)
                    if (response.isSuccessful) {
                        val loginResponse = response.body()
                        if (loginResponse != null) {
                            // Simpan status login ke SharedPreferences
                            val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                            val editor = sharedPref.edit()
                            editor.putBoolean("is_logged_in", true)
                            editor.putString("user_id", userId)
                            editor.putString("user_name", userId)
                            editor.putString("token", loginResponse.token)
                            editor.putString("role", "Moderator")  // Set default role
                            editor.putString("photo_uri", loginResponse.user.photoUri)
                            editor.apply()

                            val intent = Intent(this@LoginActivity, MainActivity::class.java)
                            startActivity(intent)
                            finish()
                        } else {
                            Toast.makeText(this@LoginActivity, "Login gagal", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(this@LoginActivity, "Login gagal: ${response.message()}", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@LoginActivity, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}