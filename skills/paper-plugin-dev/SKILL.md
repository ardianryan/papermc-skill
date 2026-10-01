---
name: paper-plugin-dev
description: Expert guidelines, modern standards, exploit-prevention blueprints, and architectural patterns for developing production-grade Minecraft Java plugins using PaperMC API (1.20-1.21+ / 26.x), Folia (Threaded Regions), Adventure API, MiniMessage, and Data Components.
---

# Paper & Folia Minecraft Plugin Development Skill

Skill ini adalah standar acuan arsitektur tingkat lanjut, pedoman keamanan tingkat tinggi (*exploit-proof*), dan katalog pola desain modern untuk mengembangkan plugin Minecraft Java Server berbasis **PaperMC (1.20.6, 1.21+ hingga 26.x)** dan **Folia (Regionized Multi-Threading)**.

---

## 1. Prasyarat Lingkungan & Matriks Kompatibilitas

| Komponen | Standar Minimum | Rekomendasi Terkini | Catatan Kritis |
| :--- | :--- | :--- | :--- |
| **Java SDK** | **Java 21 (LTS)** | **Java 21 LTS** / Java 25 Ready | Minecraft 1.20.5+ dan Paper modern **wajib** Java 21+. Target Paper 26.x membutuhkan Java 25+. |
| **Build Tool** | Gradle 8.10+ | **Gradle 9.7+ (Kotlin DSL)** | Gunakan `jvmToolchain(21)` dan `pluginManagement { mavenCentral() }`. |
| **Paper API** | `1.21.4-R0.1-SNAPSHOT` | `1.21.11-R0.1-SNAPSHOT` | Repositori: `https://repo.papermc.io/repository/maven-public/` |
| **API Discovery** | Manual | **PaperMC Fill v3 API** | Query versi real-time via `https://fill.papermc.io/v3/projects/paper`. |
| **Text Handling** | Adventure 4.17+ | **Kyori Adventure + MiniMessage** | Jangan pernah menggunakan `org.bukkit.ChatColor` atau simbol `§`. |

---

## 2. Alur Kerja Standar (Workflow) AI Coding Agent

Ketika diminta membuat, memodifikasi, atau mereview kode plugin Paper/Folia:

1. **Periksa Versi & Target Lingkungan (Discovery)**:
   - Jalankan `npx papermc-skill check-update` atau query API Fill v3 untuk memastikan versi build PaperMC dan Java yang ditargetkan.
2. **Tetapkan Manifest Modern (`paper-plugin.yml`)**:
   - Wajib mendeklarasikan `folia-supported: true`.
   - Gunakan `bootstrapper:` untuk inisialisasi lifecycle dan pendaftaran Brigadier commands.
3. **Pilih Arsitektur Concurrency yang Aman**:
   - Jika menyentuh Entity atau Player: `player.getScheduler()`.
   - Jika memodifikasi Block, World, atau Chunk: `RegionScheduler`.
   - Jika global server state: `GlobalRegionScheduler`.
   - Jika Database, File I/O, Web Request, atau perhitungan berat: `AsyncScheduler` atau `CompletableFuture`.
4. **Terapkan Pertahanan Keamanan & Anti-Exploit (Wajib)**:
   - Validasi input angka (cegah `NaN`, `Infinity`, overflow, dan angka negatif).
   - Lindungi transaksi inventory dari click-spam dan cursor race conditions.
   - Gunakan `UUID` bukan instance `Player` pada semua state/cache memori.
   - Amankan data kustom pada item menggunakan `PersistentDataContainer` (PDC).
5. **Kompilasi & Validasi Bersih**:
   - Pastikan kode lulus kompilasi tanpa warning deprecation kritis.

---

## 3. Protokol Keamanan & Anti-Exploit (Production-Grade Security)

### A. Eliminasi Dupe & Transaksi Inventori Aman
Eksploitasi duplikasi item paling umum terjadi akibat *race condition* antara klik cepat, drag item, menutup inventory, atau manipulasi asinkron.
- **Aturan Mutlak**: Jangan pernah memodifikasi `Inventory` atau `ItemStack` pemain dari dalam thread asinkron! Selalu jalankan di thread region pemain (`player.getScheduler()`).
- **Debounce Click Spam**: Berikan batasan waktu (misal 150-200ms) antar-aksi klik pada GUI kustom untuk mencegah eksploitasi auto-clicker.
- **Handling Cursor Saat Menu Ditutup**: Jika menu kustom ditutup paksa (`InventoryCloseEvent` atau disconnect), pastikan item di cursor pemain tidak hilang atau berduplikasi.

### B. Sanitasi Angka & Validasi Ekonomi (Anti-Overflow & NaN Injection)
Banyak plugin ekonomi dan RPG jebol karena pemain memasukkan input seperti `/pay Player NaN`, `/pay Player -1000000`, atau angka melebihi batas 64-bit integer.
- Selalu gunakan `BigDecimal` atau integer berbasis *cents* (sen) untuk saldo uang.
- Selalu tolak:
  ```java
  if (Double.isNaN(amount) || Double.isInfinite(amount) || amount <= 0.0) {
      throw new IllegalArgumentException("Nilai nominal tidak valid!");
  }
  ```

### C. PDC Anti-Tamper & Cryptographic Hashing
Pemain dengan client cheat atau akses anvil/crafting terkadang mencoba memalsukan nama kustom lore untuk meniru item langka.
- **Solusi**: Jangan pernah mengenali item khusus dari `DisplayName` atau `Lore`!
- Simpan ID permanen di `PersistentDataContainer` (PDC).
- Untuk item bernilai tinggi, sertakan *signature token* sederhana (misal hash HMAC dari server salt + item UUID) di PDC agar client tidak bisa memalsukan metadata via bug NBT paket.

### D. Mencegah DoS Melalui Synchronous Chunk Loading
Memanggil `world.getBlockAt(x, y, z)` pada koordinat yang belum dimuat (misal koordinat 30,000,000) akan membekukan server selama ratusan milidetik.
- Selalu periksa `world.isChunkLoaded(x >> 4, z >> 4)` sebelum akses synchronous, atau gunakan:
  ```java
  world.getChunkAtAsync(x >> 4, z >> 4).thenAccept(chunk -> { ... });
  ```

### E. Mencegah SQL Injection & Kebocoran Pool Database
- Jangan pernah menyambung string query SQL secara langsung (`"SELECT * WHERE name = '" + input + "'"`).
- Wajib menggunakan `PreparedStatement` dengan placeholder tanda tanya (`?`).
- Selalu gunakan connection pool (seperti **HikariCP**) dan bungkus dalam `try-with-resources` agar koneksi selalu dikembalikan ke pool.

---

## 4. Katalog Resep Kode Modern (Production Recipes)

### Resep 1: Manifest Modern Folia-Ready (`src/main/resources/paper-plugin.yml`)
```yaml
name: EpicPaperPlugin
version: '1.0.0'
main: com.example.plugin.EpicPlugin
bootstrapper: com.example.plugin.EpicPluginBootstrap
api-version: '1.21'
folia-supported: true
authors:
  - DeveloperName
description: Production-grade Paper & Folia plugin built with modern architectural standards.
dependencies:
  server:
    # Deklarasikan dependensi server jika ada (Vault, LuckPerms, dll)
```

### Resep 2: Lifecycle Bootstrap & Modern Brigadier Command
Gunakan Paper Lifecycle Events (Minecraft 1.20.6+ / 1.21+) tanpa memerlukan deklarasi command di file `plugin.yml`:

```java
package com.example.plugin;

import com.mojang.brigadier.Command;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import io.papermc.paper.command.brigadier.Commands;
import io.papermc.paper.plugin.bootstrap.BootstrapContext;
import io.papermc.paper.plugin.bootstrap.PluginBootstrap;
import io.papermc.paper.plugin.lifecycle.event.types.LifecycleEvents;
import net.kyori.adventure.text.minimessage.MiniMessage;
import org.jspecify.annotations.NullMarked;

import java.util.List;

@NullMarked
public class EpicPluginBootstrap implements PluginBootstrap {

    @Override
    public void bootstrap(BootstrapContext context) {
        context.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event -> {
            final Commands registrar = event.registrar();

            registrar.register(
                Commands.literal("safepay")
                    .requires(source -> source.getSender().hasPermission("epicplugin.pay"))
                    .then(Commands.argument("target", StringArgumentType.word())
                        .then(Commands.argument("amount", DoubleArgumentType.doubleArg(0.01, 1_000_000_000.0))
                            .executes(ctx -> {
                                var sender = ctx.getSource().getSender();
                                String target = StringArgumentType.getString(ctx, "target");
                                double amount = DoubleArgumentType.getDouble(ctx, "amount");

                                // Sanitasi keamanan ketat
                                if (Double.isNaN(amount) || Double.isInfinite(amount) || amount <= 0) {
                                    sender.sendMessage(MiniMessage.miniMessage().deserialize("<red>Jumlah transfer tidak valid!</red>"));
                                    return Command.SINGLE_SUCCESS;
                                }

                                sender.sendMessage(MiniMessage.miniMessage().deserialize(
                                    "<green>Mengirim <gold>$" + String.format("%.2f", amount) + "</gold> ke <yellow>" + target + "</yellow>!</green>"
                                ));
                                return Command.SINGLE_SUCCESS;
                            })
                        )
                    )
                    .build(),
                "Transfer saldo aman dengan validasi anti-overflow",
                List.of("paysecure")
            );
        });
    }
}
```

### Resep 3: Sistem PDC Anti-Eksploitasi & Item Builder
```java
package com.example.plugin.util;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.Plugin;

import java.util.UUID;

public final class SafeItemUtil {

    private static NamespacedKey KEY_ITEM_ID;
    private static NamespacedKey KEY_LEVEL;
    private static NamespacedKey KEY_SIG;

    public static void initKeys(Plugin plugin) {
        KEY_ITEM_ID = new NamespacedKey(plugin, "custom_id");
        KEY_LEVEL = new NamespacedKey(plugin, "item_level");
        KEY_SIG = new NamespacedKey(plugin, "sec_sig");
    }

    public static ItemStack createCustomSword(String customId, int level) {
        ItemStack item = new ItemStack(Material.DIAMOND_SWORD);
        item.editMeta(meta -> {
            meta.displayName(MiniMessage.miniMessage().deserialize("<gradient:#00d2ff:#3a7bd5>Excalibur Tier " + level + "</gradient>"));
            PersistentDataContainer pdc = meta.getPersistentDataContainer();
            pdc.set(KEY_ITEM_ID, PersistentDataType.STRING, customId);
            pdc.set(KEY_LEVEL, PersistentDataType.INTEGER, level);
            // Tambahkan identifier internal acak
            pdc.set(KEY_SIG, PersistentDataType.STRING, UUID.randomUUID().toString());
        });
        return item;
    }

    public static boolean isCustomItem(ItemStack item, String expectedId) {
        if (item == null || !item.hasItemMeta()) return false;
        String id = item.getItemMeta().getPersistentDataContainer().get(KEY_ITEM_ID, PersistentDataType.STRING);
        return expectedId.equals(id);
    }
}
```

### Resep 4: Controller GUI Menu Anti-Dupe dengan Debounce
```java
package com.example.plugin.gui;

import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryCloseEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class SafeMenuController implements InventoryHolder, Listener {

    private final Inventory inventory;
    private final Map<UUID, Long> clickDebounce = new ConcurrentHashMap<>();

    public SafeMenuController(Component title, int size) {
        this.inventory = Bukkit.createInventory(this, size, title);
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onClick(InventoryClickEvent event) {
        if (!(event.getInventory().getHolder() instanceof SafeMenuController)) {
            return;
        }

        // 1. Selalu batalkan pergerakan item
        event.setCancelled(true);

        if (!(event.getWhoClicked() instanceof Player player)) {
            return;
        }

        // 2. Proteksi Click Spam (Debounce 200ms)
        long now = System.currentTimeMillis();
        long lastClick = clickDebounce.getOrDefault(player.getUniqueId(), 0L);
        if (now - lastClick < 200) {
            return; // Abaikan click spam
        }
        clickDebounce.put(player.getUniqueId(), now);

        // 3. Batasi hanya slot inventory menu
        if (event.getClickedInventory() == event.getInventory()) {
            int slot = event.getSlot();
            handleSlotAction(player, slot);
        }
    }

    @EventHandler
    public void onDrag(InventoryDragEvent event) {
        if (event.getInventory().getHolder() instanceof SafeMenuController) {
            event.setCancelled(true); // Cegah eksploitasi drag-dupe
        }
    }

    @EventHandler
    public void onClose(InventoryCloseEvent event) {
        if (event.getInventory().getHolder() instanceof SafeMenuController) {
            clickDebounce.remove(event.getPlayer().getUniqueId());
        }
    }

    private void handleSlotAction(Player player, int slot) {
        // Eksekusi aksi tombol sesuai slot
    }
}
```

### Resep 5: Universal Folia & Paper Scheduler Adapter
Adapter yang 100% aman dijalankan baik di server Paper standar maupun di server Folia bertingkat multi-region:

```java
package com.example.plugin.util;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Entity;
import org.bukkit.plugin.Plugin;

import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public final class UniversalScheduler {

    private static final boolean IS_FOLIA;

    static {
        boolean folia;
        try {
            Class.forName("io.papermc.paper.threadedregions.RegionizedServer");
            folia = true;
        } catch (ClassNotFoundException e) {
            folia = false;
        }
        IS_FOLIA = folia;
    }

    public static boolean isFolia() {
        return IS_FOLIA;
    }

    /** Menjalankan task yang terikat pada region spesifik entity */
    public static void runForEntity(Plugin plugin, Entity entity, Runnable runnable) {
        if (IS_FOLIA) {
            entity.getScheduler().run(plugin, task -> runnable.run(), null);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    /** Menjalankan task pada koordinat blok tertentu (chunk region) */
    public static void runAtLocation(Plugin plugin, Location location, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getRegionScheduler().execute(plugin, location, runnable);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    /** Menjalankan task asinkron murni (I/O, Database, Network) */
    public static void runAsync(Plugin plugin, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getAsyncScheduler().runNow(plugin, task -> runnable.run());
        } else {
            Bukkit.getScheduler().runTaskAsynchronously(plugin, runnable);
        }
    }

    /** Menjalankan task asynchronous dengan delay */
    public static void runAsyncDelayed(Plugin plugin, Runnable runnable, long delayMs) {
        if (IS_FOLIA) {
            Bukkit.getAsyncScheduler().runDelayed(plugin, task -> runnable.run(), delayMs, TimeUnit.MILLISECONDS);
        } else {
            long ticks = Math.max(1, delayMs / 50);
            Bukkit.getScheduler().runTaskLaterAsynchronously(plugin, runnable, ticks);
        }
    }
}
```

### Resep 6: Database Async Tangguh (HikariCP Connection Pool)
```java
package com.example.plugin.database;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DatabaseManager {

    private final HikariDataSource dataSource;
    private final ExecutorService dbExecutor = Executors.newFixedThreadPool(4);

    public DatabaseManager(String jdbcUrl, String username, String password) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(5000);
        config.setPoolName("PaperPlugin-HikariPool");
        this.dataSource = new HikariDataSource(config);
    }

    public CompletableFuture<Integer> getCoinsAsync(UUID playerUuid) {
        return CompletableFuture.supplyAsync(() -> {
            String query = "SELECT coins FROM player_data WHERE uuid = ?";
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement stmt = conn.prepareStatement(query)) {
                stmt.setString(1, playerUuid.toString());
                try (ResultSet rs = stmt.executeQuery()) {
                    if (rs.next()) {
                        return rs.getInt("coins");
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
            return 0;
        }, dbExecutor);
    }

    public void shutdown() {
        dbExecutor.shutdown();
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
    }
}
```

---

## 5. Matriks Anti-Patterns vs Solusi Mutakhir

| Jangan Pernah Dilakukan ❌ | Alasan Bahaya ⚠️ | Cara yang Benar & Aman ✔️ |
| :--- | :--- | :--- |
| `ChatColor.RED + "Pesan"` | Deprecated & merusak formatting console/modern client | `MiniMessage.miniMessage().deserialize("<red>Pesan</red>")` |
| `public static Set<Player> list;` | Menyebabkan **Memory Leak** gigabyte data dunia/koneksi | `public static Set<UUID> list;` |
| `world.getChunkAt(x, z)` acak di loop | Membekukan main tick server (TPS drop masif) | `world.getChunkAtAsync(x, z)` |
| `Bukkit.getScheduler()` di Folia | Melemparkan exception atau merusak sinkronisasi region | Gunakan `RegionScheduler` atau `UniversalScheduler` |
| Mengubah inventory di thread async | Menyebabkan duplikasi item (*concurrency corruption*) | Selalu jadwalkan modifikasi inventori di thread region |
| Membaca string SQL langsung | Rawan **SQL Injection** berbahaya | Selalu gunakan `PreparedStatement` dengan parameter `?` |
| `new NamespacedKey(...)` di loop/hit | Alokasi objek sampah tinggi di memori GC | Buat konstanta `public static final NamespacedKey` |
| Mempercayai displayName/lore item | Pemain bisa memalsukan item via anvil/client cheat | Selalu simpan dan verifikasi metadata via **PDC** |
| Angka tanpa batas di command ekonomi | Rawan input `NaN`, negatif, dan integer overflow | Validasi `Double.isFinite()` dan batasi rentang minimal/maksimal |

---

## 6. Daftar Periksa (Audit Checklist) Sebelum Release Plugin

Sebelum merilis build plugin ke production atau server publik, pastikan:

- [ ] `paper-plugin.yml` terdefinisi dengan `folia-supported: true`.
- [ ] Tidak ada referensi ke `org.bukkit.ChatColor` di seluruh codebase.
- [ ] Semua pendaftaran command menggunakan Brigadier modern (`LifecycleEvents.COMMANDS`).
- [ ] Tidak ada penyimpanan langsung objek `Player`, `World`, atau `Entity` di static cache.
- [ ] Semua operasi File, Database, dan HTTP berjalan 100% asinkron.
- [ ] GUI kustom memiliki perlindungan `setCancelled(true)` dan sistem debounce klik.
- [ ] Semua item kustom divalidasi via `PersistentDataContainer` (PDC).
- [ ] Seluruh koneksi database menggunakan connection pool dengan `try-with-resources`.
- [ ] File jar terkompilasi bersih menggunakan Gradle 9.x dengan target Java 21 LTS.
