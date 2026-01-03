package com.example.kapallist

import androidx.room.TypeConverter
import com.squareup.moshi.JsonAdapter
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class Converters {

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    @TypeConverter
    fun fromStringList(value: String?): List<String> {
        if (value.isNullOrEmpty()) return emptyList()
        val adapter: JsonAdapter<List<String>> = moshi.adapter(Types.newParameterizedType(List::class.java, String::class.java))
        return adapter.fromJson(value) ?: emptyList()
    }

    @TypeConverter
    fun toStringList(list: List<String>?): String {
        val adapter: JsonAdapter<List<String>> = moshi.adapter(Types.newParameterizedType(List::class.java, String::class.java))
        return adapter.toJson(list ?: emptyList())
    }

    @TypeConverter
    fun fromDokumenKapalList(value: String?): List<DokumenKapal> {
        if (value.isNullOrEmpty()) return emptyList()
        val adapter: JsonAdapter<List<DokumenKapal>> = moshi.adapter(Types.newParameterizedType(List::class.java, DokumenKapal::class.java))
        return adapter.fromJson(value) ?: emptyList()
    }

    @TypeConverter
    fun toDokumenKapalList(list: List<DokumenKapal>?): String {
         val adapter: JsonAdapter<List<DokumenKapal>> = moshi.adapter(Types.newParameterizedType(List::class.java, DokumenKapal::class.java))
        return adapter.toJson(list ?: emptyList())
    }

    @TypeConverter
    fun fromLocalDate(value: String?): LocalDate? {
        return value?.let {
            try {
                LocalDate.parse(it, DateTimeFormatter.ISO_LOCAL_DATE)
            } catch (e: Exception) {
                try {
                    // Try DD/MM/YYYY format
                    LocalDate.parse(it, DateTimeFormatter.ofPattern("d/M/yyyy"))
                } catch (e2: Exception) {
                    null
                }
            }
        }
    }

    @TypeConverter
    fun toLocalDate(date: LocalDate?): String? {
        return date?.format(DateTimeFormatter.ISO_LOCAL_DATE)
    }
}
