package com.example.kapallist

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(entities = [KapalMasukEntity::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class KapalMasukDatabase : RoomDatabase() {
    abstract fun kapalMasukDao(): KapalMasukDao

    companion object {
        @Volatile
        private var INSTANCE: KapalMasukDatabase? = null

        fun getDatabase(context: Context): KapalMasukDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    KapalMasukDatabase::class.java,
                    "kapal_masuk_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
