package com.example.kapallist

import retrofit2.http.*
import retrofit2.Response
import okhttp3.MultipartBody

interface ApiService {
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

    // Dokumen
    @GET("api/dokumen")
    suspend fun getAllDokumen(@Header("Authorization") token: String): Response<ApiResponse<List<DokumenEntity>>>

    @GET("api/dokumen/kapal/{kapalId}")
    suspend fun getDokumenByKapalId(@Header("Authorization") token: String, @Path("kapalId") kapalId: Int): Response<ApiResponse<List<DokumenEntity>>>

    @GET("api/dokumen/{id}")
    suspend fun getDokumenById(@Header("Authorization") token: String, @Path("id") id: Int): Response<ApiResponse<DokumenEntity>>

    @POST("api/dokumen")
    suspend fun createDokumen(@Header("Authorization") token: String, @Body dokumen: DokumenEntity): Response<ApiResponse<DokumenEntity>>

    @PUT("api/dokumen/{id}")
    suspend fun updateDokumen(@Header("Authorization") token: String, @Path("id") id: Int, @Body dokumen: DokumenEntity): Response<ApiResponse<DokumenEntity>>

    @DELETE("api/dokumen/{id}")
    suspend fun deleteDokumen(@Header("Authorization") token: String, @Path("id") id: Int): Response<ApiResponse<Unit>>

    // Kapal Masuk
    @GET("api/kapal-masuk")
    suspend fun getAllKapalMasuk(@Header("Authorization") token: String): Response<ApiResponse<List<KapalMasukEntity>>>

    @GET("api/kapal-masuk/{id}")
    suspend fun getKapalMasukById(@Header("Authorization") token: String, @Path("id") id: Int): Response<ApiResponse<KapalMasukEntity>>

    @POST("api/kapal-masuk")
    suspend fun createKapalMasuk(@Header("Authorization") token: String, @Body kapalMasuk: KapalMasukEntity): Response<ApiResponse<KapalMasukEntity>>

    @PUT("api/kapal-masuk/{id}")
    suspend fun updateKapalMasuk(@Header("Authorization") token: String, @Path("id") id: Int, @Body kapalMasuk: KapalMasukEntity): Response<ApiResponse<KapalMasukEntity>>

    @DELETE("api/kapal-masuk/{id}")
    suspend fun deleteKapalMasuk(@Header("Authorization") token: String, @Path("id") id: Int): Response<ApiResponse<Unit>>

    // File upload
    @Multipart
    @POST("api/upload")
    suspend fun uploadFile(@Header("Authorization") token: String, @Part file: MultipartBody.Part): Response<ApiResponse<String>>

    // User management
    @GET("api/users")
    suspend fun getAllUsers(@Header("Authorization") token: String): Response<ApiResponse<List<User>>>

    @PUT("api/users/{userId}")
    suspend fun updateUser(@Header("Authorization") token: String, @Path("userId") userId: String, @Body user: User): Response<ApiResponse<User>>

    @DELETE("api/users/{userId}")
    suspend fun deleteUser(@Header("Authorization") token: String, @Path("userId") userId: String): Response<ApiResponse<Unit>>

    // Authentication
    @POST("api/login")
    suspend fun login(@Body loginRequest: LoginRequest): Response<ApiResponse<LoginResponse>>

    @POST("api/register")
    suspend fun register(@Body registerRequest: RegisterRequest): Response<ApiResponse<Unit>>

    @POST("api/users")
    suspend fun createUser(@Header("Authorization") token: String, @Body user: User): Response<ApiResponse<Unit>>

    // Version check
    @GET("/")
    suspend fun getVersion(): Response<ApiResponse<Map<String, Any>>>
}
