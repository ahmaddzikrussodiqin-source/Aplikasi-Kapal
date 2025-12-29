package com.example.kapallist

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
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

    @Query("DELETE FROM kapal_status_table WHERE kapalId = :kapalId")
    suspend fun deleteKapalStatusByKapalId(kapalId: Int)

    @Query("DELETE FROM kapal_status_table WHERE id = :id")
    suspend fun deleteKapalStatusById(id: Int)

    @Query("DELETE FROM kapal_status_table")
    suspend fun deleteAllKapalStatus()
}
