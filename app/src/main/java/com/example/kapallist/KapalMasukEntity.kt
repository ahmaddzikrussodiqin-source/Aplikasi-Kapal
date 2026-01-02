package com.example.kapallist

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo
import java.time.LocalDate

@Entity(tableName = "kapal_masuk_table")
data class KapalMasukEntity(
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
    var tanggalKeberangkatan: String? = null,
    var totalHariPersiapan: Int? = null,
    var tanggalBerangkat: String? = null,
    var tanggalKembali: LocalDate? = null,
    @ColumnInfo(defaultValue = "[]") var listPersiapan: List<String> = emptyList(),
    @ColumnInfo(defaultValue = "0") var isFinished: Boolean = false,
    var perkiraanKeberangkatan: LocalDate? = null,
    var durasiSelesaiPersiapan: String? = null,
    var durasiBerlayar: String? = null,
    @ColumnInfo(defaultValue = "persiapan") var statusKerja: String = "persiapan"
)
