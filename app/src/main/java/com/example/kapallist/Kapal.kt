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

    constructor(kapalMasukEntity: KapalMasukEntity) : this(
        nama = kapalMasukEntity.nama,
        tanggalInput = kapalMasukEntity.tanggalInput,
        tanggalKeberangkatan = kapalMasukEntity.tanggalKeberangkatan,
        totalHariPersiapan = kapalMasukEntity.totalHariPersiapan,
        tanggalBerangkat = kapalMasukEntity.tanggalBerangkat,
        tanggalKembali = kapalMasukEntity.tanggalKembali,
        listPersiapan = kapalMasukEntity.listPersiapan.toMutableList(),
        listDokumen = mutableListOf(), // KapalMasukEntity doesn't have this
        isFinished = kapalMasukEntity.isFinished,
        perkiraanKeberangkatan = kapalMasukEntity.perkiraanKeberangkatan,
        durasiSelesaiPersiapan = kapalMasukEntity.durasiSelesaiPersiapan,
        id = kapalMasukEntity.id
    )

    fun toKapalEntity(): KapalEntity {
        return KapalEntity(
            id = this.id,
            nama = this.nama,
            tanggalInput = this.tanggalInput,
            tanggalKeberangkatan = this.tanggalKeberangkatan,
            totalHariPersiapan = this.totalHariPersiapan,
            tanggalBerangkat = this.tanggalBerangkat,
            tanggalKembali = this.tanggalKembali,
            listPersiapan = this.listPersiapan,
            listDokumen = this.listDokumen,
            isFinished = this.isFinished,
            perkiraanKeberangkatan = this.perkiraanKeberangkatan,
            durasiSelesaiPersiapan = this.durasiSelesaiPersiapan
        )
    }

    fun toKapalMasukEntity(): KapalMasukEntity {
        return KapalMasukEntity(
            id = this.id,
            nama = this.nama,
            namaPemilik = "", // Kapal doesn't have this
            tandaSelar = "",
            tandaPengenal = "",
            beratKotor = "",
            beratBersih = "",
            merekMesin = "",
            nomorSeriMesin = "",
            jenisAlatTangkap = "",
            tanggalInput = this.tanggalInput,
            tanggalKeberangkatan = this.tanggalKeberangkatan,
            totalHariPersiapan = this.totalHariPersiapan,
            tanggalBerangkat = this.tanggalBerangkat,
            tanggalKembali = this.tanggalKembali,
            listPersiapan = this.listPersiapan,
            isFinished = this.isFinished,
            perkiraanKeberangkatan = this.perkiraanKeberangkatan,
            durasiSelesaiPersiapan = this.durasiSelesaiPersiapan,
            statusKerja = "persiapan" // default
        )
    }
}

data class DokumenKapal(
    var jenis: String? = null,
    var pathGambar: MutableList<String> = mutableListOf(),
    var pathPdf: MutableList<String> = mutableListOf(),
    var tanggalExpired: String? = null
)