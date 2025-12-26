package com.example.kapallist

import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Authentication
    @POST("api/login")
    suspend fun login(@Body loginRequest: LoginRequest): Response<LoginResponse>

    @POST("api/register")
    suspend fun register(@Body registerRequest: RegisterRequest): Response<ApiResponse<User>>

    // Users
    @GET("api/users")
    suspend fun getAllUsers(@Header("Authorization") token: String): Response<ApiResponse<List<User>>>

    @PUT("api/users/{userId}")
    suspend fun updateUser(@Header("Authorization") token: String, @Path("userId") userId: String, @Body user: User): Response<ApiResponse<User>>

    @DELETE("api/users/{userId}")
    suspend fun deleteUser(@Header("Authorization") token: String, @Path("userId") userId: String): Response<ApiResponse<Unit>>

    // Kapal
    @GET("api/kapal")
    suspend fun getAllKapal(@Header("Authorization") token: String): Response<ApiResponse<List<KapalEntity>>>

    @GET("api/kapal/{id}")
    suspend fun getKapalById(@Header("Authorization") token: String, @Path("id") id: Int): Response<ApiResponse<KapalEntity>>

    @POST("api/kapal")
    suspend fun createKapal(@Header("Authorization") token: String, @Body kapal: KapalEntity): Response<ApiResponse<KapalEntity>>

    @PUT("api/kapal/{id}")
    suspend fun updateKapal(@Header("Authorization") token: String, @Path("id") id: Int, @Body kapal: KapalEntity): Response<ApiResponse<KapalEntity>>

    @DELETE("api/kapal/{id}")
    suspend fun deleteKapal(@Header("Authorization") token: String, @Path("id") id: Int): Response<ApiResponse<Unit>>

    // File upload
    @Multipart
    @POST("api/upload")
    suspend fun uploadFile(@Header("Authorization") token: String, @Part file: okhttp3.MultipartBody.Part): Response<ApiResponse<String>>
}

// Data classes for API requests/responses
data class LoginRequest(val userId: String, val password: String)
data class RegisterRequest(val userId: String, val password: String)

data class LoginResponse(
    val success: Boolean,
    val message: String,
    val data: LoginData
)

data class LoginData(
    val token: String,
    val user: User
)

data class ApiResponse<T>(
    val success: Boolean,
    val message: String,
    val data: T? = null
)
