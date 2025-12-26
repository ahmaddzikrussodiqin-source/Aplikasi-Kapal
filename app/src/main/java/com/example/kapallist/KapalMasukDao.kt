package com.example.kapallist

import androidx.room.*

@Dao
interface KapalMasukDao {

    @Query("SELECT * FROM kapal_masuk_table")
    suspend fun getAllKapalMasuk(): List<KapalMasukEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertKapalMasuk(kapal: KapalMasukEntity): Long

    @Update
    suspend fun updateKapalMasuk(kapal: KapalMasukEntity)

    @Delete
    suspend fun deleteKapalMasuk(kapal: KapalMasukEntity)

    @Query("DELETE FROM kapal_masuk_table WHERE id = :id")
    suspend fun deleteKapalMasukById(id: Int)

    @Query("SELECT * FROM kapal_masuk_table WHERE id = :id")
    suspend fun getKapalMasukById(id: Int): KapalMasukEntity?

    @Query("DELETE FROM kapal_masuk_table")
    suspend fun deleteAllKapalMasuk()
}
