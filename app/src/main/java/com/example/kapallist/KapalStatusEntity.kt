package com.example.kapallist

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "kapal_status_table")
data class KapalStatusEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    var kapalId: Int = 0,
    var tanggalKeberangkatan: String? = null,
    var totalHariPersiapan: Int? = null,
    var tanggalBerangkat: String? = null,
    var tanggalKembali: String? = null,
    @ColumnInfo(defaultValue = "[]") var listPersiapan: List<String> = emptyList(),
    @ColumnInfo(defaultValue = "0") var isFinished: Boolean = false,
    var perkiraanKeberangkatan: String? = null,
    var durasiSelesaiPersiapan: String? = null
)
