package com.example.kapallist

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView

class CheckItemAdapter(
    private val checklistItems: List<String>,
    private val checklistStates: Map<String, Boolean>,
    private val checklistDates: Map<String, String>,
    private val isEditable: Boolean,
    private val context: android.content.Context,
    private val onToggle: (String) -> Unit,
    private val onEdit: (String) -> Unit,
    private val onDelete: (String) -> Unit
) : RecyclerView.Adapter<CheckItemAdapter.ViewHolder>() {

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val cbItem: CheckBox = itemView.findViewById(R.id.cb_checklist_item)
        val tvItemName: TextView = itemView.findViewById(R.id.tv_item_name)
        val tvDate: TextView = itemView.findViewById(R.id.tv_date)
        val btnEdit: ImageButton = itemView.findViewById(R.id.btn_edit_item)
        val btnDelete: ImageButton = itemView.findViewById(R.id.btn_delete_item)

        fun bind(item: String, position: Int) {
            val isChecked = checklistStates[item] == true
            val date = checklistDates[item] ?: "-"

            cbItem.isChecked = isChecked
            cbItem.isEnabled = isEditable
            tvItemName.text = item
            tvItemName.paintFlags = if (isChecked) tvItemName.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG else tvItemName.paintFlags and android.graphics.Paint.STRIKE_THRU_TEXT_FLAG.inv()
            tvItemName.alpha = if (isChecked) 0.6f else 1.0f
            tvDate.text = date

            cbItem.setOnCheckedChangeListener { _, _ ->
                onToggle(item)
            }

            btnEdit.setOnClickListener { onEdit(item) }
            btnDelete.setOnClickListener { onDelete(item) }

            btnEdit.visibility = if (isEditable) View.VISIBLE else View.GONE
            btnDelete.visibility = if (isEditable) View.VISIBLE else View.GONE

            if (!isEditable) {
                tvItemName.setOnClickListener(null)
            } else {
                tvItemName.setOnClickListener { onEdit(item) }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_checklist, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(checklistItems[position], position)
    }

    override fun getItemCount(): Int = checklistItems.size
}

