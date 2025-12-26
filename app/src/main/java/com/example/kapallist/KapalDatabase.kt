@TypeConverters(Converters::class)
abstract class KapalDatabase : RoomDatabase() {
    abstract fun kapalDao(): KapalDao
    abstract fun userDao(): UserDao
=======
@Database(entities = [KapalEntity::class, User::class], version = 11, exportSchema = false)
@TypeConverters(Converters::class)
abstract class KapalDatabase : RoomDatabase() {
    abstract fun kapalDao(): KapalDao
    abstract fun userDao(): UserDao
