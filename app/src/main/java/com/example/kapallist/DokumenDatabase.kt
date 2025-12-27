package com.example.kapallist

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(entities = [DokumenEntity::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class DokumenDatabase : RoomDatabase() {
    abstract fun dokumenDao(): DokumenDao

    companion object {
        @Volatile
        private var INSTANCE: DokumenDatabase? = null

        fun getDatabase(context: Context): DokumenDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    DokumenDatabase::class.java,
                    "dokumen_database"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
