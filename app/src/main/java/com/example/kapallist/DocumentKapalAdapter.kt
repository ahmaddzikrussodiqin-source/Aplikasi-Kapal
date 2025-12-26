package com.example.kapallist

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
        holder.tvNamaKapal.text = kapal.nama ?: "Tanpa Nama"
        holder.itemView.setOnClickListener { onItemClick(kapal) }
        holder.btnEdit.visibility = View.GONE
        holder.btnDelete.visibility = View.GONE
    }

    override fun getItemCount(): Int = kapalList.size
}