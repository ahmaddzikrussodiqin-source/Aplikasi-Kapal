package com.example.kapallist

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo
import java.time.LocalDate

@Entity(tableName = "kapal_masuk_table")
data class KapalMasukEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    var nama: String? = null,
    var tanggalKembali: LocalDate? = null,
    @ColumnInfo(defaultValue = "[]") var listPersiapan: List<String> = emptyList()
)
