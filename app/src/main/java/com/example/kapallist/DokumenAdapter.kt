package com.example.kapallist

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class DokumenAdapter(
    private val dokumenList: MutableList<DokumenKapal>,
    private val onImagePreviewClick: (position: Int) -> Unit,
    private val onPdfPreviewClick: (position: Int) -> Unit,
    private val onEditClick: (position: Int) -> Unit
) : RecyclerView.Adapter<DokumenAdapter.DokumenViewHolder>() {

    inner class DokumenViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvNamaDokumen: TextView = itemView.findViewById(R.id.tv_nama_dokumen)
        val tvTanggalExpired: TextView = itemView.findViewById(R.id.tv_tanggal_expired)
        val tvJumlahGambar: TextView = itemView.findViewById(R.id.tv_jumlah_gambar)
        val tvJumlahPdf: TextView = itemView.findViewById(R.id.tv_jumlah_pdf)
        val btnEditDokumen: ImageButton = itemView.findViewById(R.id.btn_edit_dokumen)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DokumenViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_dokumen, parent, false)
        return DokumenViewHolder(view)
    }

    override fun onBindViewHolder(holder: DokumenViewHolder, position: Int) {
        val dokumen = dokumenList[position]

        holder.tvNamaDokumen.text = dokumen.jenis ?: "Tidak ada jenis"
        holder.tvTanggalExpired.text = dokumen.tanggalExpired ?: "-"
        holder.tvJumlahGambar.text = "Lihat Gambar: ${dokumen.pathGambar.size}"
        holder.tvJumlahPdf.text = "Lihat PDF: ${dokumen.pathPdf.size}"

        if (isExpiringSoon(dokumen.tanggalExpired)) {
            holder.tvNamaDokumen.setTextColor(Color.RED)
            holder.tvNamaDokumen.text = "${dokumen.jenis?.uppercase() ?: ""} ( PERPANJANG )"
        } else {
            holder.tvNamaDokumen.setTextColor(Color.GREEN)
        }

        holder.tvJumlahGambar.setOnClickListener {
            onImagePreviewClick(position)
        }

        holder.tvJumlahPdf.setOnClickListener {
            onPdfPreviewClick(position)
        }

        holder.btnEditDokumen.setOnClickListener {
            onEditClick(position)
        }

        // Add wiggle animation to indicate the button is clickable
        val wiggleAnimator = ObjectAnimator.ofFloat(holder.btnEditDokumen, "rotation", -5f, 5f, -5f, 5f, 0f)
        wiggleAnimator.duration = 1000
        wiggleAnimator.repeatCount = ValueAnimator.INFINITE
        wiggleAnimator.repeatMode = ValueAnimator.REVERSE
        wiggleAnimator.start()
    }

    override fun getItemCount(): Int = dokumenList.size

    fun getItem(position: Int): DokumenKapal {
        return dokumenList[position]
    }

    private fun isExpiringSoon(tanggalExpired: String?): Boolean {
        if (tanggalExpired.isNullOrEmpty()) return false
        return try {
            val parts = tanggalExpired.split("/")
            if (parts.size != 3) return false
            val day = parts[0].toInt()
            val month = parts[1].toInt() - 1
            val year = parts[2].toInt()
            val calendar = java.util.Calendar.getInstance()
            calendar.set(year, month, day, 0, 0, 0)
            val today = java.util.Calendar.getInstance()
            val diffMillis = calendar.timeInMillis - today.timeInMillis
            val diffDays = java.util.concurrent.TimeUnit.MILLISECONDS.toDays(diffMillis).toInt()
            diffDays in 0..90
        } catch (e: Exception) {
            false
        }
    }
}