package com.example.kapallist

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo
import java.time.LocalDate

@Entity(tableName = "kapal_masuk_table")
data class KapalMasukEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    var nama: String? = null,
    var namaPemilik: String? = null,
    var tandaSelar: String? = null,
    var tandaPengenal: String? = null,
    var beratKotor: String? = null,
    var beratBersih: String? = null,
    var merekMesin: String? = null,
    var nomorSeriMesin: String? = null,
    var jenisAlatTangkap: String? = null,
    var tanggalInput: String? = null,
    var tanggalKeberangkatan: String? = null,
    var totalHariPersiapan: Int? = null,
    var tanggalBerangkat: String? = null,
    var tanggalKembali: String? = null,
    @ColumnInfo(defaultValue = "[]") var listPersiapan: List<String> = emptyList(),
    var isFinished: Boolean = false,
    var perkiraanKeberangkatan: LocalDate? = null,
    var durasiSelesaiPersiapan: String? = null,
    var durasiBerlayar: String? = null,
    var statusKerja: String? = "persiapan",
    var checklistStates: Map<String, Boolean> = emptyMap(),
    var checklistDates: Map<String, String> = emptyMap()
)
