package com.example.kapallist

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class KapalAdapter(
    private val kapalList: List<KapalEntity>,
    private val onItemClick: (KapalEntity) -> Unit,
    private val onEditClick: (KapalEntity) -> Unit,
    private val onDeleteClick: (KapalEntity) -> Unit
) : RecyclerView.Adapter<KapalAdapter.KapalViewHolder>() {

    inner class KapalViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvNamaKapal: TextView = itemView.findViewById(R.id.tv_nama_kapal)
        val btnEdit: Button = itemView.findViewById(R.id.btn_edit)
        val btnDelete: Button = itemView.findViewById(R.id.btn_delete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): KapalViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_kapal_simple, parent, false)
        return KapalViewHolder(view)
    }

    override fun onBindViewHolder(holder: KapalViewHolder, position: Int) {
        val kapal = kapalList[position]
        holder.tvNamaKapal.text = kapal.nama ?: "Tanpa Nama"  // Handle null
        holder.itemView.setOnClickListener { onItemClick(kapal) }
        holder.btnEdit.setOnClickListener { onEditClick(kapal) }
        holder.btnDelete.setOnClickListener { onDeleteClick(kapal) }
    }

    override fun getItemCount(): Int = kapalList.size
}
