package com.example.kapallist

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import androidx.room.TypeConverters

@Database(entities = [KapalEntity::class, User::class], version = 8, exportSchema = false)  // Naikkan ke 8
@TypeConverters(Converters::class)
abstract class KapalDatabase : RoomDatabase() {
    abstract fun kapalDao(): KapalDao
    abstract fun userDao(): UserDao

    companion object {
        @Volatile
        private var INSTANCE: KapalDatabase? = null

        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE kapal_table ADD COLUMN durasiSelesaiPersiapan TEXT")
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("""
                    CREATE TABLE kapal_table_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        nama TEXT,
                        namaPemilik TEXT NOT NULL DEFAULT '',
                        tandaSelar TEXT NOT NULL DEFAULT '',
                        tandaPengenal TEXT NOT NULL DEFAULT '',
                        beratKotor TEXT NOT NULL DEFAULT '',
                        beratBersih TEXT NOT NULL DEFAULT '',
                        merekMesin TEXT NOT NULL DEFAULT '',
                        nomorSeriMesin TEXT NOT NULL DEFAULT '',
                        jenisAlatTangkap TEXT NOT NULL DEFAULT '',
                        tanggalInput TEXT,
                        tanggalKeberangkatan TEXT,
                        totalHariPersiapan INTEGER,
                        tanggalBerangkat TEXT,
                        tanggalKembali TEXT,
                        listPersiapan TEXT NOT NULL DEFAULT '[]',
                        listDokumen TEXT NOT NULL DEFAULT '[]',
                        isFinished INTEGER NOT NULL DEFAULT 0,
                        perkiraanKeberangkatan TEXT,
                        durasiSelesaiPersiapan TEXT
                    )
                """)
                database.execSQL("""
                    INSERT INTO kapal_table_new (id, nama, tanggalInput, tanggalKeberangkatan, totalHariPersiapan, tanggalBerangkat, tanggalKembali, listPersiapan, listDokumen, isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan)
                    SELECT id, nama, tanggalInput, tanggalKeberangkatan, totalHariPersiapan, tanggalBerangkat, tanggalKembali, listPersiapan, listDokumen, isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan FROM kapal_table
                """)
                database.execSQL("DROP TABLE kapal_table")
                database.execSQL("ALTER TABLE kapal_table_new RENAME TO kapal_table")
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("CREATE TABLE IF NOT EXISTS user_table (userId TEXT PRIMARY KEY NOT NULL, password TEXT NOT NULL, jabatan TEXT NOT NULL DEFAULT 'Admin', photoUri TEXT)")
            }
        }

        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("CREATE TABLE IF NOT EXISTS user_table (userId TEXT PRIMARY KEY NOT NULL, password TEXT NOT NULL, jabatan TEXT NOT NULL DEFAULT 'Admin', photoUri TEXT)")
            }
        }

        private val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL("ALTER TABLE user_table DROP COLUMN jabatan")
            }
        }

        private val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // Recreate kapal_table to remove 'undefined' defaults for nullable columns
                database.execSQL("""
                    CREATE TABLE kapal_table_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        nama TEXT,
                        namaPemilik TEXT NOT NULL DEFAULT '',
                        tandaSelar TEXT NOT NULL DEFAULT '',
                        tandaPengenal TEXT NOT NULL DEFAULT '',
                        beratKotor TEXT NOT NULL DEFAULT '',
                        beratBersih TEXT NOT NULL DEFAULT '',
                        merekMesin TEXT NOT NULL DEFAULT '',
                        nomorSeriMesin TEXT NOT NULL DEFAULT '',
                        jenisAlatTangkap TEXT NOT NULL DEFAULT '',
                        tanggalInput TEXT,
                        tanggalKeberangkatan TEXT,
                        totalHariPersiapan INTEGER,
                        tanggalBerangkat TEXT,
                        tanggalKembali TEXT,
                        listPersiapan TEXT NOT NULL DEFAULT '[]',
                        listDokumen TEXT NOT NULL DEFAULT '[]',
                        isFinished INTEGER NOT NULL DEFAULT 0,
                        perkiraanKeberangkatan TEXT,
                        durasiSelesaiPersiapan TEXT
                    )
                """)
                database.execSQL("""
                    INSERT INTO kapal_table_new (
                        id, nama, namaPemilik, tandaSelar, tandaPengenal, beratKotor, beratBersih,
                        merekMesin, nomorSeriMesin, jenisAlatTangkap, tanggalInput, tanggalKeberangkatan,
                        totalHariPersiapan, tanggalBerangkat, tanggalKembali, listPersiapan, listDokumen,
                        isFinished, perkiraanKeberangkatan, durasiSelesaiPersiapan
                    )
                    SELECT
                        id,
                        CASE WHEN nama = 'undefined' THEN NULL ELSE nama END,
                        namaPemilik, tandaSelar, tandaPengenal, beratKotor, beratBersih,
                        merekMesin, nomorSeriMesin, jenisAlatTangkap,
                        CASE WHEN tanggalInput = 'undefined' THEN NULL ELSE tanggalInput END,
                        CASE WHEN tanggalKeberangkatan = 'undefined' THEN NULL ELSE tanggalKeberangkatan END,
                        CASE WHEN totalHariPersiapan = 'undefined' THEN NULL ELSE totalHariPersiapan END,
                        CASE WHEN tanggalBerangkat = 'undefined' THEN NULL ELSE tanggalBerangkat END,
                        CASE WHEN tanggalKembali = 'undefined' THEN NULL ELSE tanggalKembali END,
                        listPersiapan, listDokumen, isFinished,
                        CASE WHEN perkiraanKeberangkatan = 'undefined' THEN NULL ELSE perkiraanKeberangkatan END,
                        CASE WHEN durasiSelesaiPersiapan = 'undefined' THEN NULL ELSE durasiSelesaiPersiapan END
                    FROM kapal_table
                """)
                database.execSQL("DROP TABLE kapal_table")
                database.execSQL("ALTER TABLE kapal_table_new RENAME TO kapal_table")
            }
        }

        private val MIGRATION_7_8 = object : Migration(7, 8) {
            override fun migrate(database: SupportSQLiteDatabase) {
                // No changes needed; schema is already correct
            }
        }
        fun getDatabase(context: Context): KapalDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    KapalDatabase::class.java,
                    "kapal_database"
                )
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7)  // Tambahkan MIGRATION_6_7
                    .fallbackToDestructiveMigration()  // Fallback jika migration gagal
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}