 package com.example.kapallist

data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null
)

data class LoginRequest(
    val userId: String,
    val password: String
)

data class RegisterRequest(
    val userId: String,
    val password: String,
    val nama: String? = null
)

data class LoginResponse(
    val token: String,
    val user: User
)

data class UploadResponse(
    val filename: String,
    val path: String,
    val size: Long
)
