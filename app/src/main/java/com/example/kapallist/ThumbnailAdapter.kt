package com.example.kapallist

import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import java.io.File

class ThumbnailAdapter(private val imageUris: List<String>, private val onItemClick: (Int) -> Unit) : RecyclerView.Adapter<ThumbnailAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_thumbnail, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val file = File(imageUris[position])
        holder.imageView.setImageURI(Uri.fromFile(file))  // Gunakan file path
        holder.itemView.setOnClickListener { onItemClick(position) }
    }

    override fun getItemCount(): Int = imageUris.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val imageView: ImageView = itemView.findViewById(R.id.iv_thumbnail)
    }
}