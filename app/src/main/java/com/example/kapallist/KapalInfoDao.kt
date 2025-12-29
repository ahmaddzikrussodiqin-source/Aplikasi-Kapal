package com.example.kapallist

import androidx.room.*

@Dao
interface KapalInfoDao {

    @Query("SELECT * FROM kapal_info_table")
    suspend fun getAllKapalInfo(): List<KapalInfoEntity>

    @Query("SELECT * FROM kapal_info_table WHERE id = :id")
    suspend fun getKapalInfoById(id: Int): KapalInfoEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertKapalInfo(kapalInfo: KapalInfoEntity): Long

    @Update
    suspend fun updateKapalInfo(kapalInfo: KapalInfoEntity)

    @Delete
    suspend fun deleteKapalInfo(kapalInfo: KapalInfoEntity)

    @Query("DELETE FROM kapal_info_table WHERE id = :id")
    suspend fun deleteKapalInfoById(id: Int)

    @Query("DELETE FROM kapal_info_table")
    suspend fun deleteAllKapalInfo()

    // Get kapal info with status using JOIN
    @Query("""
        SELECT ki.*, ks.id as statusId, ks.kapalId, ks.tanggalKeberangkatan,
               ks.totalHariPersiapan, ks.tanggalBerangkat, ks.tanggalKembali,
               ks.listPersiapan, ks.isFinished, ks.perkiraanKeberangkatan,
               ks.durasiSelesaiPersiapan
        FROM kapal_info_table ki
        LEFT JOIN kapal_status_table ks ON ki.id = ks.kapalId
    """)
    suspend fun getAllKapalInfoWithStatus(): List<KapalStatusWithInfo>

    @Query("""
        SELECT ki.*, ks.id as statusId, ks.kapalId, ks.tanggalKeberangkatan,
               ks.totalHariPersiapan, ks.tanggalBerangkat, ks.tanggalKembali,
               ks.listPersiapan, ks.isFinished, ks.perkiraanKeberangkatan,
               ks.durasiSelesaiPersiapan
        FROM kapal_info_table ki
        LEFT JOIN kapal_status_table ks ON ki.id = ks.kapalId
        WHERE ki.id = :kapalId
    """)
    suspend fun getKapalInfoWithStatusById(kapalId: Int): KapalStatusWithInfo?
}
