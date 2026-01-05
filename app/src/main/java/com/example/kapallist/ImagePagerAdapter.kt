package com.example.kapallist

import android.content.Context
import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import com.bumptech.glide.Glide
import java.io.File

class ImagePagerAdapter(private val context: Context, private val images: MutableList<String>) : RecyclerView.Adapter<ImagePagerAdapter.ViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_image, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val imagePath = images[position]
        if (imagePath.startsWith("http")) {
            // Load from URL
            Glide.with(holder.itemView.context).load(imagePath).into(holder.imageView)
        } else if (File(imagePath).exists()) {
            // Load from local file
            Glide.with(holder.itemView.context).load(File(imagePath)).into(holder.imageView)
        }
        holder.tvImageNumber.text = "${position + 1}/${images.size}"
    }

    override fun getItemCount(): Int = images.size

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val imageView: ImageView = itemView.findViewById(R.id.image_view)
        val tvImageNumber: TextView = itemView.findViewById(R.id.tv_image_number)
    }
}