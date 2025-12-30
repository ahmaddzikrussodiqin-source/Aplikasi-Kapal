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
) {
    constructor(kapalEntity: KapalEntity) : this(
        nama = kapalEntity.nama,
        tanggalInput = kapalEntity.tanggalInput,
        tanggalKeberangkatan = kapalEntity.tanggalKeberangkatan,
        totalHariPersiapan = kapalEntity.totalHariPersiapan,
        tanggalBerangkat = kapalEntity.tanggalBerangkat,
        tanggalKembali = kapalEntity.tanggalKembali,
        listPersiapan = kapalEntity.listPersiapan.toMutableList(),
        listDokumen = kapalEntity.listDokumen.toMutableList(),
        isFinished = kapalEntity.isFinished,
        perkiraanKeberangkatan = kapalEntity.perkiraanKeberangkatan,
        durasiSelesaiPersiapan = kapalEntity.durasiSelesaiPersiapan,
        id = kapalEntity.id
    )
}

data class DokumenKapal(
    var jenis: String? = null,
    var pathGambar: MutableList<String> = mutableListOf(),
    var pathPdf: MutableList<String> = mutableListOf(),
    var tanggalExpired: String? = null
)