package com.example.kapallist

import android.app.AlertDialog
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import java.text.SimpleDateFormat
import java.util.*

class KapalMasukAdapter(
    private val kapalMasukList: MutableList<KapalMasukEntity>,
    private val context: android.content.Context,
    private val onDeleteClick: (KapalMasukEntity) -> Unit,
    private val onEditClick: (KapalMasukEntity) -> Unit,
    private val onTambahKebutuhan: (KapalMasukEntity) -> Unit,
    private val onFinishClick: (KapalMasukEntity) -> Unit,
    private val onUnfinishClick: (KapalMasukEntity) -> Unit
) : RecyclerView.Adapter<KapalMasukAdapter.KapalMasukViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): KapalMasukViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_kapal_masuk, parent, false)
        return KapalMasukViewHolder(view)
    }

    override fun onBindViewHolder(holder: KapalMasukViewHolder, position: Int) {
        holder.bind(kapalMasukList[position])
    }

    override fun getItemCount(): Int = kapalMasukList.size

    fun updateList(newList: List<KapalMasukEntity>) {
        kapalMasukList.clear()
        kapalMasukList.addAll(newList)
        notifyDataSetChanged()
    }

    inner class KapalMasukViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvNamaKapal: TextView = itemView.findViewById(R.id.tv_nama_kapal)
        private val tvOwner: TextView = itemView.findViewById(R.id.tv_owner)
        private val tvStatus: TextView = itemView.findViewById(R.id.tv_status)
        private val tvTanggalKembali: TextView = itemView.findViewById(R.id.tv_tanggal_kembali)
        private val tvPerkiraanKeberangkatan: TextView = itemView.findViewById(R.id.tv_perkiraan_keberangkatan)
        private val tvDurasiBerlabuh: TextView = itemView.findViewById(R.id.tv_durasi_berlabuh)
        private val tvDurasiBerlayar: TextView = itemView.findViewById(R.id.tv_durasi_berlayar)
        private val chipCompletion: Chip = itemView.findViewById(R.id.chip_completion)
        private val rvChecklist: RecyclerView = itemView.findViewById(R.id.rv_checklist)
        private val btnEdit: Button = itemView.findViewById(R.id.btn_edit)
        private val btnTambahKebutuhan: Button = itemView.findViewById(R.id.btn_tambah_kebutuhan)
        private val btnFinish: Button = itemView.findViewById(R.id.btn_finish)
        private val btnUnfinish: Button = itemView.findViewById(R.id.btn_unfinish)
        private val btnDelete: Button = itemView.findViewById(R.id.btn_delete)

        fun bind(kapal: KapalMasukEntity) {
            tvNamaKapal.text = kapal.nama ?: "Tanpa Nama"
            tvOwner.text = "Pemilik: ${kapal.namaPemilik ?: "-"}"
            tvStatus.text = "Status: ${kapal.status ?: "-"}"
            tvTanggalKembali.text = kapal.tanggalKembali ?: "-"
            tvPerkiraanKeberangkatan.text = kapal.perkiraanKeberangkatan?.toString() ?: "-"

            // Durations
            tvDurasiBerlabuh.text = calculateDurasiBerlabuh(kapal.tanggalKembali)
            tvDurasiBerlayar.text = calculateDurasiBerlayar(kapal)

            // Completion badge
            val checkedCount = (kapal.checklistStates?.values?.count { it == true } ?: 0)
            val total = kapal.listPersiapan.size
            val completion = if (total > 0) (checkedCount * 100 / total) else 0
            chipCompletion.text = if (kapal.isFinished) "✅ Telah Berangkat" else "⏳ Persiapan ($completion%)"

            // Checklist RV - display preparation list (view only)
            rvChecklist.layoutManager = LinearLayoutManager(context)
            val checklistItems = kapal.listPersiapan
            if (checklistItems.isNotEmpty()) {
                val isEditableChecklist = !kapal.isFinished
                val checkAdapter = CheckItemAdapter(
                    checklistItems,
                    kapal.checklistStates ?: emptyMap(),
                    kapal.checklistDates ?: emptyMap(),
                    isEditable = isEditableChecklist,
                    context,
                    onToggle = { item ->
                        // TODO: Implement toggle logic with API/socket
                        Toast.makeText(context, "Toggle $item (implement API call)", Toast.LENGTH_SHORT).show()
                    },
                    onEdit = { item ->
                        Toast.makeText(context, "Edit $item", Toast.LENGTH_SHORT).show()
                    },
                    onDelete = { item ->
                        Toast.makeText(context, "Delete $item", Toast.LENGTH_SHORT).show()
                    }
                )
                rvChecklist.adapter = checkAdapter
            }

            // Dynamic buttons
            btnEdit.visibility = if (!kapal.isFinished) View.VISIBLE else View.GONE
            btnTambahKebutuhan.visibility = if (kapal.isFinished) View.VISIBLE else View.GONE
            btnFinish.visibility = if (!kapal.isFinished) View.VISIBLE else View.GONE
            btnUnfinish.visibility = if (kapal.isFinished) View.VISIBLE else View.GONE
            btnDelete.visibility = View.GONE

            btnEdit.setOnClickListener { onEditClick(kapal) }
            btnTambahKebutuhan.setOnClickListener { onTambahKebutuhan(kapal) }
            btnFinish.setOnClickListener { onFinishClick(kapal) }
            btnUnfinish.setOnClickListener { onUnfinishClick(kapal) }
            // btnDelete.setOnClickListener { onDeleteClick(kapal) } // Disabled
        }

        private fun calculateDurasiBerlabuh(tanggalKembali: String?): String {
            if (tanggalKembali.isNullOrEmpty()) return "-"
            try {
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val kembali = sdf.parse(tanggalKembali)
                val today = Date()
                if (kembali?.after(today) == true) return "Belum kembali"
                val diff = today.time - kembali.time
                val days = diff / (1000 * 60 * 60 * 24)
                return "$days hari"
            } catch (e: Exception) {
                return "-"
            }
        }

        private fun calculateDurasiBerlayar(kapal: KapalMasukEntity): String {
            val perkiraan = kapal.perkiraanKeberangkatan?.toString()
            if (perkiraan.isNullOrEmpty()) return "-"
            try {
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val keberangkatan = sdf.parse(perkiraan)
                val today = Date()
                if (keberangkatan?.after(today) == true) return "Belum berlayar"
                val diff = today.time - keberangkatan.time
                val days = diff / (1000 * 60 * 60 * 24)
                return "$days hari"
            } catch (e: Exception) {
                return "-"
            }
        }
    }
}

