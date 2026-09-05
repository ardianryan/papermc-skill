# Best Practices & Optimasi Performa Plugin Paper

Pengembangan plugin Minecraft di server berkapasitas besar menuntut efisiensi tinggi, bebas memory leak, dan tidak memblokir tick game. Dokumen ini merangkum aturan emas dan anti-pattern yang sering terjadi.

---

## 1. Mencegah Memory Leak (Kebocoran Memori)

Minecraft memiliki arsitektur objek yang saling terhubung erat. Menyimpan referensi objek Bukkit di memori Java lebih lama dari masa hidupnya dapat mencegah Garbage Collector (GC) membersihkan ratusan megabyte data.

### 🔴 Anti-Pattern: Menyimpan Objek Bukkit di Collection Statis
```java
// SANGAT BERBAHAYA: Player objek menahan referensi ke World, Chunk, Connection, dll.
public static final Set<Player> activePlayers = new HashSet<>();
public static final Map<Player, PlayerData> dataMap = new HashMap<>();
```
Jika pemain disconnect, objek `Player` tidak akan bisa di-garbage collect!

### 🟢 Solusi: Simpan `UUID`
```java
// AMAN: UUID hanya 16-byte identifier yang tidak menahan referensi dunia/koneksi
public static final Set<UUID> activePlayerUuids = new HashSet<>();
public static final Map<UUID, PlayerData> dataMap = new ConcurrentHashMap<>();

// Ambil instance player hanya saat dibutuhkan:
Player player = Bukkit.getPlayer(uuid);
if (player != null) {
    // Gunakan
}
```

> **Aturan Umum**: Jangan pernah menyimpan `Player`, `Entity`, `World`, `Chunk`, atau `Block` di dalam field permanen/statis. Gunakan `UUID`, `NamespacedKey`, atau koordinat primitif (`worldName`, `x`, `y`, `z`).

---

## 2. Operasi I/O & Database Selalu Asinkron

Setiap tick server berjalan dalam ~50 milidetik (20 TPS). Operasi disk I/O, pembacaan file besar, koneksi web/HTTP, atau query database yang membutuhkan waktu 100ms akan langsung menyebabkan server lag/freeze (tps drop).

### 🟢 Solusi: Gunakan Async Threads & CompletableFuture
```java
import java.util.concurrent.CompletableFuture;
import org.bukkit.Bukkit;

public CompletableFuture<PlayerData> loadDataAsync(UUID uuid) {
    return CompletableFuture.supplyAsync(() -> {
        // Berjalan di luar thread game (off-main-thread)
        return database.fetchUser(uuid);
    }, myPluginThreadPool).thenApply(data -> {
        return data != null ? data : new PlayerData(uuid);
    });
}

// Menggunakan hasilnya:
loadDataAsync(player.getUniqueId()).thenAccept(data -> {
    // Jika perlu memodifikasi state game Bukkit (seperti memberi item),
    // jadwalkan kembali ke scheduler region pemain:
    player.getScheduler().run(plugin, task -> {
        player.giveExp(data.getPendingExp());
    }, null);
});
```

---

## 3. Menghindari Synchronous Chunk Loading

Memanggil `world.getChunkAt(x, z)` atau `location.getBlock()` pada chunk yang belum di-load akan memaksa server memuat chunk tersebut dari disk secara synchronous (membekukan tick thread hingga chunk selesai dibaca).

### 🔴 Anti-Pattern
```java
Chunk chunk = world.getChunkAt(x, z); // Membekukan server jika chunk belum di-load!
```

### 🟢 Solusi Paper: Asynchronous Chunk Loading
Gunakan API Paper `getChunkAtAsync`:

```java
world.getChunkAtAsync(x, z, true).thenAccept(chunk -> {
    // Chunk berhasil dimuat tanpa lag spike pada TPS
    processChunkBlocks(chunk);
});
```

---

## 4. Konfigurasi (`config.yml`) yang Tangguh

Di Paper, file YAML secara default menggunakan encoding UTF-8. Pastikan membaca dan menyimpan file konfigurasi dengan aman:

```java
// Menyimpan default config dari jar jika belum ada
saveDefaultConfig();

// Reload config
reloadConfig();
FileConfiguration config = getConfig();

// Mengambil pesan dengan fallback default
String rawMessage = config.getString("messages.welcome", "<green>Selamat datang!</green>");
Component message = MiniMessage.miniMessage().deserialize(rawMessage);
```

Untuk struktur config yang sangat kompleks, pertimbangkan menggunakan library **Configurate** (`org.spongepowered:configurate-yaml`) yang mendukung pemeliharaan komentar file YAML, schema validation, dan serialisasi otomatis ke record Java.

---

## 5. Ringkasan Checklist Anti-Pattern

| Jangan Lakukan ❌ | Lakukan Ini ✔️ |
| :--- | :--- |
| `ChatColor.RED + "Teks"` | `MiniMessage.miniMessage().deserialize("<red>Teks</red>")` |
| `player.sendMessage("§a...")` | `player.sendMessage(Component)` |
| `new NamespacedKey(...)` di per-event loop | Simpan instance `NamespacedKey` sebagai `static final` |
| `world.getBlockAt(x, y, z)` acak di async thread | Akses block hanya di thread region yang bersangkutan |
| Mengabaikan `paper-plugin.yml` untuk plugin baru | Manfaatkan `paper-plugin.yml` dan `PluginBootstrap` |
| Menahan koneksi database terbuka di main thread | Gunakan connection pool (seperti HikariCP) & query async |
| Mengabaikan `folia-supported` | Rancang scheduler menggunakan abstraksi region / universal |
