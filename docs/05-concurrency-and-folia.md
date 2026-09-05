# Konkurensi, Threading & Kompatibilitas Folia

Salah satu perubahan paling revolusioner di ekosistem Paper adalah kedatangan **Folia**. Folia memecah satu "Server Main Thread" Minecraft menjadi ratusan thread regional mandiri (**Threaded Regions**).

Konsekuensinya, metode konkurensi lama seperti `Bukkit.getScheduler()` atau mengakses state world dari sembarang thread akan menyebabkan **`IllegalStateException` atau crash fatal** di Folia.

---

## 1. Model Threading: Bukkit vs Paper vs Folia

```
[Bukkit / Vanilla]
Satu Main Thread ─── Tick Semua Dunia, Entity, Blok, Redstone, AI, Chunk ───>

[Folia Regionized Threading]
Region Thread 1  ─── Tick Region Dunia A (Chunk 0..32, 0..32) ───>
Region Thread 2  ─── Tick Region Dunia A (Chunk 64..96, 64..96) ──>
Region Thread 3  ─── Tick Nether (Region B) ──────────────────────>
Global Thread    ─── Tick Weather, Time, Player List, Commands ───>
Async Threads    ─── Network I/O, File Saving, Database Queries ──>
```

Di Folia:
- Tidak ada lagi konsep "The Main Thread".
- Objek `World`, `Entity`, dan `Block` hanya boleh diakses di **thread region yang memiliki chunk/lokasi tersebut**.
- Mengakses entity pemain dari thread lain akan melempar error `Plugin attempted to access entity from wrong thread`.

---

## 2. Hirarki Scheduler Modern di Folia & Paper

Paper memperkenalkan scheduler baru yang kompatibel dengan Folia dan Paper standar:

### 1. `RegionScheduler`
Digunakan untuk mengeksekusi task pada lokasi dunia atau koordinat chunk tertentu.

```java
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.plugin.Plugin;

Location loc = player.getLocation();

// Menjalankan task 1-kali pada thread region lokasi tersebut
Bukkit.getRegionScheduler().execute(plugin, loc, () -> {
    loc.getBlock().setType(org.bukkit.Material.GOLD_BLOCK);
});

// Menjalankan task berulang (repeating) pada region
Bukkit.getRegionScheduler().runAtFixedRate(plugin, loc, task -> {
    loc.getWorld().spawnParticle(org.bukkit.Particle.FLAME, loc, 5);
}, 20L, 20L); // delay 20 tick, period 20 tick
```

### 2. `EntityScheduler`
Setiap `Entity` memiliki scheduler tersendiri. Task akan dieksekusi tepat pada thread region di mana entity tersebut sedang berada, bahkan jika entity tersebut bergerak/teleport antar region.

```java
player.getScheduler().run(plugin, task -> {
    player.giveExp(10);
    player.sendMessage("Bonus EXP didapatkan!");
}, () -> {
    // Callback jika entity telah mati atau tidak valid sebelum task sempat berjalan
    plugin.getLogger().warning("Pemain logout sebelum exp diberikan.");
});
```

### 3. `GlobalRegionScheduler`
Digunakan untuk hal-hal yang bersifat global server dan tidak terikat pada koordinat block/entity tertentu (misal: pengumuman berkala chat global, update scoreboard global, waktu dunia).

```java
Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, task -> {
    Bukkit.broadcast(MiniMessage.miniMessage().deserialize("<gold>[Pengumuman] Kunjungi discord kami!</gold>"));
}, 100L, 1200L);
```

### 4. `AsyncScheduler`
Untuk I/O, database query, request HTTP, komputasi berat non-Bukkit API. Menggunakan waktu nyata (`java.time.TimeUnit`), bukan tick game:

```java
import java.util.concurrent.TimeUnit;

Bukkit.getAsyncScheduler().runDelayed(plugin, task -> {
    // Menjalankan query database MySQL / SQLite
    database.savePlayerData(uuid, data);
}, 5, TimeUnit.SECONDS);
```

---

## 3. Pola Abstraksi Scheduler Universal (Paper + Folia)

Banyak plugin perlu berjalan di server Paper standar (single-thread) dan Folia sekaligus. Cara terbaik adalah membuat lapisan pembungkus (*abstraction wrapper*) seperti yang digunakan oleh **Chunky** dan **squaremap**:

```java
public final class PlatformScheduler {

    private static final boolean IS_FOLIA = checkFolia();

    private static boolean checkFolia() {
        try {
            Class.forName("io.papermc.paper.threadedregions.RegionizedServer");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    public static boolean isFolia() {
        return IS_FOLIA;
    }

    public static void runLocation(Plugin plugin, Location location, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getRegionScheduler().execute(plugin, location, runnable);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    public static void runEntity(Plugin plugin, Entity entity, Runnable runnable) {
        if (IS_FOLIA) {
            entity.getScheduler().run(plugin, task -> runnable.run(), null);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    public static void runAsync(Plugin plugin, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getAsyncScheduler().runNow(plugin, task -> runnable.run());
        } else {
            Bukkit.getScheduler().runTaskAsynchronously(plugin, runnable);
        }
    }
}
```

---

## 4. Aturan Wajib untuk Kompatibilitas Folia

1. **Deklarasikan di Manifest**:
   Tambahkan `folia-supported: true` di `paper-plugin.yml`. Jika tidak, server Folia akan menampilkan peringatan bahwa plugin Anda berpotensi tidak aman.
2. **Jangan Pernah Mengakses Chunk/Block dari Async Thread**:
   Gunakan `world.getChunkAtAsync(x, z)` yang mengembalikan `CompletableFuture<Chunk>`.
3. **Gunakan TeleportAsync**:
   Gunakan `entity.teleportAsync(location)` alih-alih `entity.teleport(location)`. Di Folia, teleportasi melintasi region thread yang berbeda harus dilakukan secara asinkron.
4. **Hindari State Statis Global**:
   Variabel static yang menyimpan list player atau entity aktif dapat mengalami *race condition* jika dimodifikasi oleh beberapa thread region secara paralel. Gunakan struktur data thread-safe (`ConcurrentHashMap`, `CopyOnWriteArrayList`) bila terpaksa.
