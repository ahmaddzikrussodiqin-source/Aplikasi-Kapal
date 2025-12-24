package com.example.kapallist

data class Kapal(
    var nama: String? = null,
    var tanggalInput: String? = null,
    var tanggalKeberangkatan: String? = null,
    var totalHariPersiapan: Int? = null,
    var tanggalBerangkat: String? = null,
    var tanggalKembali: String? = null,
    var listPersiapan: MutableList<String> = mutableListOf(),
    var listDokumen: MutableList<DokumenKapal> = mutableListOf(),
    var isFinished: Boolean = false,
    var perkiraanKeberangkatan: String? = null,
    var durasiSelesaiPersiapan: String? = null,
    var id: Int = 0
)

data class DokumenKapal(
    var jenis: String? = null,
    var pathGambar: MutableList<String> = mutableListOf(),
    var pathPdf: MutableList<String> = mutableListOf(),
    var tanggalExpired: String? = null
)