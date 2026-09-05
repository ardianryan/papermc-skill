---
name: paper-plugin-dev
description: Expert guidelines, modern standards, and architectural blueprints for developing Minecraft Java server plugins using the PaperMC API (1.20-1.21+), Folia, Adventure API, MiniMessage, and Paperweight.
---

# Paper Minecraft Plugin Development Skill

Skill ini memberikan panduan otoritatif, standar arsitektur modern, dan resep coding siap pakai untuk membuat atau memodifikasi plugin Minecraft Java Server berbasis **PaperMC (1.20.6 / 1.21+)** dan **Folia (Threaded Regions)**.

---

## 1. Prasyarat Lingkungan & Dependensi

| Komponen | Versi yang Dibutuhkan | Catatan |
| :--- | :--- | :--- |
| **Java SDK** | **Java 21 (LTS)** atau lebih baru | Minecraft 1.20.5+ dan Paper modern **wajib** Java 21+. |
| **Gradle** | **Gradle 8.5+** (Disarankan 8.10+ / 9.x) | Gunakan Gradle Wrapper bawaan (`./gradlew`). |
| **Paper API** | `io.papermc.paper:paper-api:1.21.4-R0.1-SNAPSHOT` | Repositori: `https://repo.papermc.io/repository/maven-public/` |
| **Mojang Mappings** | `io.papermc.paperweight.userdev` | Hanya jika membutuhkan akses langsung ke internal `net.minecraft.*`. |

---

## 2. Alur Kerja Standar (Workflow) untuk AI / Developer

Saat diminta membuat fitur atau plugin Paper baru, ikuti urutan berikut:

1. **Tentukan Manifest (`src/main/resources/paper-plugin.yml`)**:
   - Berikan `folia-supported: true`.
   - Cantumkan `bootstrapper:` jika menggunakan Paper Brigadier Command.
2. **Setup PDC Keys (`PluginDataKeys.java`)**:
   - Buat konstanta `static final NamespacedKey` untuk semua data persisten (jangan instansiasi di dalam event loop).
3. **Pilih Penanganan Teks (Kyori Adventure)**:
   - Gunakan `MiniMessage.miniMessage().deserialize(...)`.
   - Jangan pernah menggunakan `§` atau `org.bukkit.ChatColor`.
4. **Pilih Pola Concurrency**:
   - Akses entity/block? Gunakan `RegionScheduler` atau `EntityScheduler`.
   - File/Database/Network? Gunakan `AsyncScheduler` atau `CompletableFuture`.
5. **Daftarkan Command & Event**:
   - Command -> Daftarkan di `BootstrapContext` via `LifecycleEvents.COMMANDS`.
   - Event -> Daftarkan di `JavaPlugin#onEnable()` via `registerEvents(...)`.

---

## 3. Resep Kode Cepat (Ready-to-Use Recipes)

### Resep A: Manifest Modern (`paper-plugin.yml`)
```yaml
name: MyAwesomePlugin
version: '1.0.0'
main: com.example.plugin.MyPlugin
bootstrapper: com.example.plugin.MyPluginBootstrap
api-version: '1.21'
folia-supported: true
authors:
  - DeveloperName
```

### Resep B: Brigadier Command Modern (Tanpa `plugin.yml`)
```java
// Daftarkan di PluginBootstrap#bootstrap:
context.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event -> {
    event.registrar().register(
        Commands.literal("warp")
            .requires(source -> source.getSender().hasPermission("plugin.warp"))
            .then(Commands.argument("target", StringArgumentType.word())
                .suggests((ctx, builder) -> {
                    builder.suggest("spawn");
                    builder.suggest("arena");
                    return builder.buildFuture();
                })
                .executes(ctx -> {
                    String target = StringArgumentType.getString(ctx, "target");
                    ctx.getSource().getSender().sendMessage(
                        MiniMessage.miniMessage().deserialize("<green>Teleporting to <gold>" + target + "</gold>...</green>")
                    );
                    return Command.SINGLE_SUCCESS;
                })
            )
            .build(),
        "Warp command description",
        List.of("gotowarp")
    );
});
```

### Resep C: PersistentDataContainer (PDC) Item & Entity
```java
// Menyimpan data pada ItemStack
NamespacedKey KEY = new NamespacedKey(plugin, "item_level");
meta.getPersistentDataContainer().set(KEY, PersistentDataType.INTEGER, 5);

// Membaca data dengan fallback default:
int level = meta.getPersistentDataContainer().getOrDefault(KEY, PersistentDataType.INTEGER, 1);
```

### Resep D: GUI Menu Aman dari Eksploitasi
```java
// 1. Buat Custom InventoryHolder
public class MenuHolder implements InventoryHolder {
    private final Inventory inv;
    public MenuHolder(Component title, int size) {
        this.inv = Bukkit.createInventory(this, size, title);
    }
    @Override public Inventory getInventory() { return inv; }
}

// 2. Di Listener:
@EventHandler
public void onMenuClick(InventoryClickEvent event) {
    if (event.getInventory().getHolder() instanceof MenuHolder) {
        event.setCancelled(true); // Selalu batalkan pergerakan item
        ItemStack item = event.getCurrentItem();
        if (item != null && item.hasItemMeta()) {
            // Baca aksi dari PDC
        }
    }
}
```

### Resep E: Universal Folia / Paper Scheduler Adapter
```java
public static void runForPlayer(Plugin plugin, Player player, Runnable runnable) {
    try {
        Class.forName("io.papermc.paper.threadedregions.RegionizedServer");
        player.getScheduler().run(plugin, task -> runnable.run(), null);
    } catch (ClassNotFoundException e) {
        Bukkit.getScheduler().runTask(plugin, runnable);
    }
}
```

### Resep F: Raycast & Partikel Sihir
```java
Location eye = player.getEyeLocation();
Vector dir = eye.getDirection().normalize();

for (double d = 1; d <= 25; d += 0.5) {
    Location p = eye.clone().add(dir.clone().multiply(d));
    player.getWorld().spawnParticle(Particle.FLAME, p, 1, 0, 0, 0, 0);
}
```

---

## 4. Anti-Patterns yang Wajib Dihindari

| Jangan Pernah Dilakukan ❌ | Cara yang Benar ✔️ |
| :--- | :--- |
| `ChatColor.RED + "Pesan"` | `MiniMessage.miniMessage().deserialize("<red>Pesan</red>")` |
| `public static Set<Player> players;` | `public static Set<UUID> playerUuids;` (Cegah memory leak) |
| `Bukkit.getScheduler()` di server Folia | Gunakan `RegionScheduler`, `EntityScheduler`, atau `AsyncScheduler` |
| `world.getChunkAt(x, z)` acak di loop | `world.getChunkAtAsync(x, z)` |
| `new NamespacedKey(...)` per hit/tick | Simpan `NamespacedKey` di `public static final` |
| Mencocokkan nama item lore untuk aksi GUI | Gunakan `PersistentDataContainer` (PDC) pada item |
| Query database di tick thread | Jalankan via `CompletableFuture.supplyAsync(...)` |

---

## 5. Referensi Kode Asli di Folder `references/`

- **Arsitektur Enterprise & Database Async**: Periksa [`references/luckperms`](file:///Users/ardianryan/Documents/minecraft-plugin-skill/references/luckperms).
- **Performa Async Chunks & Schedulers**: Periksa [`references/chunky`](file:///Users/ardianryan/Documents/minecraft-plugin-skill/references/chunky).
- **Paperweight & Incendo Cloud Commands**: Periksa [`references/squaremap`](file:///Users/ardianryan/Documents/minecraft-plugin-skill/references/squaremap).
- **MiniMessage & Paper Manifest**: Periksa [`references/miniplaceholders`](file:///Users/ardianryan/Documents/minecraft-plugin-skill/references/miniplaceholders).
- **Ekonomi & Permissions Hooking**: Periksa [`references/vault-api`](file:///Users/ardianryan/Documents/minecraft-plugin-skill/references/vault-api).
- **Setup Server Pengujian Otomatis**: Periksa [`references/run-paper`](file:///Users/ardianryan/Documents/minecraft-plugin-skill/references/run-paper).
- **Display Packet & Hologram**: Periksa [`references/decentholograms`](file:///Users/ardianryan/Documents/minecraft-plugin-skill/references/decentholograms).
