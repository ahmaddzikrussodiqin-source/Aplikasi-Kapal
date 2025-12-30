package com.example.kapallist

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface KapalStatusDao {
    @Query("SELECT * FROM kapal_status_table ORDER BY id DESC")
    fun getAllKapalStatus(): Flow<List<KapalStatusEntity>>

    @Query("SELECT * FROM kapal_status_table WHERE kapalId = :kapalId")
    suspend fun getKapalStatusByKapalId(kapalId: Int): KapalStatusEntity?

    @Query("SELECT * FROM kapal_status_table WHERE id = :id")
    suspend fun getKapalStatusById(id: Int): KapalStatusEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertKapalStatus(kapalStatus: KapalStatusEntity): Long

    @Update
    suspend fun updateKapalStatus(kapalStatus: KapalStatusEntity)

    @Delete
    suspend fun deleteKapalStatus(kapalStatus: KapalStatusEntity)

    @Query("DELETE FROM kapal_status_table WHERE kapalId = :kapalId")
    suspend fun deleteKapalStatusByKapalId(kapalId: Int)

    @Query("DELETE FROM kapal_status_table WHERE id = :id")
    suspend fun deleteKapalStatusById(id: Int)

    @Query("DELETE FROM kapal_status_table")
    suspend fun deleteAllKapalStatus()

    // New method to get kapal status with kapal info joined
    @Query("""
        SELECT ks.*, ki.nama, ki.namaPemilik, ki.tandaSelar, ki.tandaPengenal,
               ki.beratKotor, ki.beratBersih, ki.merekMesin, ki.nomorSeriMesin,
               ki.jenisAlatTangkap, ki.tanggalInput, ki.listDokumen
        FROM kapal_status_table ks
        LEFT JOIN kapal_info_table ki ON ks.kapalId = ki.id
        ORDER BY ks.id DESC
    """)
    fun getAllKapalStatusWithInfo(): Flow<List<KapalStatusWithInfo>>

    @Query("""
        SELECT ks.*, ki.nama, ki.namaPemilik, ki.tandaSelar, ki.tandaPengenal,
               ki.beratKotor, ki.beratBersih, ki.merekMesin, ki.nomorSeriMesin,
               ki.jenisAlatTangkap, ki.tanggalInput, ki.listDokumen
        FROM kapal_status_table ks
        LEFT JOIN kapal_info_table ki ON ks.kapalId = ki.id
        WHERE ks.kapalId = :kapalId
    """)
    suspend fun getKapalStatusWithInfoByKapalId(kapalId: Int): KapalStatusWithInfo?
}

data class KapalStatusWithInfo(
    val id: Int = 0,
    val kapalId: Int = 0,
    val tanggalKeberangkatan: String? = null,
    val totalHariPersiapan: Int? = null,
    val tanggalBerangkat: String? = null,
    val tanggalKembali: String? = null,
    val listPersiapan: List<String> = emptyList(),
    val isFinished: Boolean = false,
    val perkiraanKeberangkatan: String? = null,
    val durasiSelesaiPersiapan: String? = null,
    // Kapal info fields
    val nama: String? = null,
    val namaPemilik: String = "",
    val tandaSelar: String = "",
    val tandaPengenal: String = "",
    val beratKotor: String = "",
    val beratBersih: String = "",
    val merekMesin: String = "",
    val nomorSeriMesin: String = "",
    val jenisAlatTangkap: String = "",
    val tanggalInput: String? = null,
    val listDokumen: List<DokumenKapal> = emptyList()
)
