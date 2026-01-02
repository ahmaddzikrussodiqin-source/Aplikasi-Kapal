package com.example.kapallist

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

import java.util.concurrent.TimeUnit

@Entity(tableName = "kapal_table")
data class KapalEntity(
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
    var tanggalKembali: String? = null,
    @ColumnInfo(defaultValue = "[]") var listPersiapan: List<String> = emptyList(),
    @ColumnInfo(defaultValue = "[]") var listDokumen: List<DokumenKapal> = emptyList(),
    @ColumnInfo(defaultValue = "0") var isFinished: Boolean = false,
    var perkiraanKeberangkatan: String? = null,
    var durasiSelesaiPersiapan: String? = null,
    var durasiBerlayar: String? = null
)

fun hitungTotalHariPersiapan(tanggalInput: Long, tanggalKeberangkatan: Long?): Int? {
    if (tanggalKeberangkatan == null) return null
    val selisihMillis = tanggalKeberangkatan - tanggalInput
    return TimeUnit.MILLISECONDS.toDays(selisihMillis).toInt()
}

fun hitungDurasiSelesaiPersiapan(tanggalKembali: String?, tanggalSelesai: Long): String? {
    if (tanggalKembali.isNullOrEmpty()) return null
    try {
        val parts = tanggalKembali.split("/")
        if (parts.size == 3) {
            val day = parts[0].toInt()
            val month = parts[1].toInt() - 1
            val year = parts[2].toInt()
            val calendar = java.util.Calendar.getInstance()
            calendar.set(year, month, day, 0, 0, 0)
            val tanggalKembaliMillis = calendar.timeInMillis
            val selisihMillis = tanggalSelesai - tanggalKembaliMillis
            val totalJam = TimeUnit.MILLISECONDS.toHours(selisihMillis).toInt()
            val hari = totalJam / 24
            val jam = totalJam % 24
            return "$hari hari $jam jam"
        }
    } catch (e: Exception) {
        // Handle parsing error
    }
    return null
}