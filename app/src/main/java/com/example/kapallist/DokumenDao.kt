package com.example.kapallist

import androidx.room.*

@Dao
interface DokumenDao {

    @Query("SELECT * FROM dokumen_table")
    suspend fun getAllDokumen(): List<DokumenEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDokumen(dokumen: DokumenEntity): Long

    @Update
    suspend fun updateDokumen(dokumen: DokumenEntity)

    @Delete
    suspend fun deleteDokumen(dokumen: DokumenEntity)

    @Query("DELETE FROM dokumen_table WHERE id = :id")
    suspend fun deleteDokumenById(id: Int)

    @Query("SELECT * FROM dokumen_table WHERE id = :id")
    suspend fun getDokumenById(id: Int): DokumenEntity?

    @Query("SELECT * FROM dokumen_table WHERE kapalId = :kapalId")
    suspend fun getDokumenByKapalId(kapalId: Int): List<DokumenEntity>

    @Query("DELETE FROM dokumen_table WHERE kapalId = :kapalId")
    suspend fun deleteDokumenByKapalId(kapalId: Int)

    @Query("DELETE FROM dokumen_table")
    suspend fun deleteAllDokumen()
}
