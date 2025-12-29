package com.example.kapallist

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "kapal_info_table")
data class KapalInfoEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    var nama: String? = null,
    @ColumnInfo(defaultValue = "") var namaPemilik: String = "",
    @ColumnInfo(defaultValue = "") var tandaSelar: String = "",
    @ColumnInfo(defaultValue = "") var tandaPengenal: String = "",
    @ColumnInfo(defaultValue = "") var beratKotor: String = "",
    @ColumnInfo(defaultValue = "") var beratBersih: String = "",
    @ColumnInfo(defaultValue = "") var merekMesin: String = "",
    @ColumnInfo(defaultValue = "") var nomorSeriMesin: String = "",
    @ColumnInfo(defaultValue = "") var jenisAlatTangkap: String = "",
    var tanggalInput: String? = null,
    @ColumnInfo(defaultValue = "[]") var listDokumen: List<DokumenKapal> = emptyList()
)
