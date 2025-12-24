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

        btnLogin.setOnClickListener {
            val userId = etUserId.text.toString().trim()
            val password = etPassword.text.toString().trim()

            lifecycleScope.launch {
                val user = database.userDao().getUser(userId)
                if (user != null && user.password == password) {
                    // Simpan status login ke SharedPreferences (untuk session)
                    val sharedPref = getSharedPreferences("login_prefs", MODE_PRIVATE)
                    val editor = sharedPref.edit()
                    editor.putBoolean("is_logged_in", true)
                    editor.putString("user_id", userId)
                    editor.putString("user_name", user.userId)
                    // Hapus jabatan, gunakan role default atau load dari SharedPreferences jika perlu
                    editor.putString("role", "Moderator")  // Set default role, atau load dari tempat lain
                    editor.putString("photo_uri", user.photoUri)
                    editor.apply()

                    val intent = Intent(this@LoginActivity, MainActivity::class.java)
                    startActivity(intent)
                    finish()
                } else {
                    Toast.makeText(this@LoginActivity, "User ID atau Password salah", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}