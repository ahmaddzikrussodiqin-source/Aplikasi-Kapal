package com.example.kapallist

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.kapallist.R

class DocumentKapalAdapter(
    private val kapalList: MutableList<KapalEntity>,
    private val onItemClick: (KapalEntity) -> Unit
) : RecyclerView.Adapter<DocumentKapalAdapter.KapalViewHolder>() {

    private val expiringKapalIds = mutableSetOf<Int>()

    fun setExpiringKapalIds(ids: Set<Int>) {
        expiringKapalIds.clear()
        expiringKapalIds.addAll(ids)
        notifyDataSetChanged()
    }

    fun addExpiringKapalId(id: Int) {
        if (expiringKapalIds.add(id)) {
            val position = kapalList.indexOfFirst { it.id == id }
            if (position != -1) {
                notifyItemChanged(position)
            }
        }
    }

    fun removeExpiringKapalId(id: Int) {
        if (expiringKapalIds.remove(id)) {
            val position = kapalList.indexOfFirst { it.id == id }
            if (position != -1) {
                notifyItemChanged(position)
            }
        }
    }

    inner class KapalViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvNamaKapal: TextView = itemView.findViewById(R.id.tv_nama_kapal)
        val tvTanggalKembali: TextView = itemView.findViewById(R.id.tv_tanggal_kembali)
        val btnEdit: Button = itemView.findViewById(R.id.btn_edit)
        val btnDelete: Button = itemView.findViewById(R.id.btn_delete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): KapalViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_kapal_simple, parent, false)
        return KapalViewHolder(view)
    }

    override fun onBindViewHolder(holder: KapalViewHolder, position: Int) {
        val kapal = kapalList[position]
        holder.tvNamaKapal.text = kapal.nama ?: "Tanpa Nama"
        if (kapal.tanggalKembali != null) {
            holder.tvTanggalKembali.text = "Tanggal Kembali: ${kapal.tanggalKembali}"
            holder.tvTanggalKembali.visibility = View.VISIBLE
        } else {
            holder.tvTanggalKembali.visibility = View.GONE
        }
        if (expiringKapalIds.contains(kapal.id)) {
            holder.itemView.setBackgroundColor(Color.RED)
            holder.tvNamaKapal.setTextColor(Color.WHITE)
            holder.tvTanggalKembali.setTextColor(Color.WHITE)
        } else {
            holder.itemView.setBackgroundColor(Color.TRANSPARENT)
            holder.tvNamaKapal.setTextColor(Color.BLACK)
            holder.tvTanggalKembali.setTextColor(Color.BLACK)
        }
        holder.itemView.setOnClickListener { onItemClick(kapal) }
        holder.btnEdit.visibility = View.GONE
        holder.btnDelete.visibility = View.GONE
    }

    override fun getItemCount(): Int = kapalList.size
}