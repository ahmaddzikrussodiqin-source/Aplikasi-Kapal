package com.example.kapallist

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(entities = [KapalEntity::class, User::class, DokumenEntity::class], version = 5, exportSchema = false)
@TypeConverters(Converters::class)
abstract class KapalDatabase : RoomDatabase() {
    abstract fun kapalDao(): KapalDao
    abstract fun userDao(): UserDao
    abstract fun dokumenDao(): DokumenDao

    companion object {
        @Volatile
        private var INSTANCE: KapalDatabase? = null

        fun getDatabase(context: Context): KapalDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    KapalDatabase::class.java,
                    "kapal_database"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
