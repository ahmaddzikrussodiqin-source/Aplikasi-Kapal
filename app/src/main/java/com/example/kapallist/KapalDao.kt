package com.example.kapallist

import androidx.room.*

@Dao
interface KapalDao {

    @Query("SELECT * FROM kapal_table")
    suspend fun getAllKapal(): List<KapalEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertKapal(kapal: KapalEntity): Long

    @Update
    suspend fun updateKapal(kapal: KapalEntity)

    @Delete
    suspend fun deleteKapal(kapal: KapalEntity)

    @Query("DELETE FROM kapal_table WHERE id = :id")
    suspend fun deleteKapalById(id: Int)

    @Query("SELECT * FROM kapal_table WHERE id = :id")
    suspend fun getKapalById(id: Int): KapalEntity?

    @Query("DELETE FROM kapal_table")
    suspend fun deleteAllKapal()
}
