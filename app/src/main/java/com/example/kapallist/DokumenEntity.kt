package com.example.kapallist

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "dokumen_table")
data class DokumenEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    @SerializedName("kapalId") var kapalId: Int? = null,
    @SerializedName("nama") var nama: String? = null,
    @SerializedName("jenis") var jenis: String? = null,
    @SerializedName("nomor") var nomor: String? = null,
    @SerializedName("tanggalTerbit") var tanggalTerbit: String? = null,
    @SerializedName("tanggalKadaluarsa") var tanggalKadaluarsa: String? = null,
    @SerializedName("status") var status: String? = "aktif",
    @SerializedName("filePath") var filePath: String? = null,
    @SerializedName("created_at") var createdAt: String? = null
)
