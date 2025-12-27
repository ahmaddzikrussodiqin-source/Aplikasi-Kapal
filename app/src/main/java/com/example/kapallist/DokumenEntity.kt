package com.example.kapallist

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "dokumen_table")
data class DokumenEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    var namaDokumen: String? = null,
    var tanggalKadaluarsa: String? = null,
    var jumlahGambar: Int = 0,
    var jumlahPdf: Int = 0,
    var perluDiperbaharui: Boolean = false
)
