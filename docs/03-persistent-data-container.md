# PersistentDataContainer (PDC) di Paper Minecraft

`PersistentDataContainer` (PDC) adalah API resmi Bukkit/Paper untuk menyimpan data kustom secara permanen pada objek dalam game seperti:
- **Item (`ItemMeta`)**
- **Entity (`Entity`, `LivingEntity`, `Player`)**
- **Block State / Tile Entity (`TileState`)**
- **Chunk (`Chunk`)**
- **World (`World`)**

PDC menggantikan ketergantungan pada library NBT pihak ketiga (seperti NBTAPI) atau pembacaan lore tersembunyi yang rapuh. Data yang disimpan di PDC disimpan langsung dalam NBT vanilla Minecraft dan otomatis disimpan/di-load bersama world data.

---

## 1. Konsep Kunci: NamespacedKey

Setiap nilai yang disimpan di PDC diidentifikasi oleh `NamespacedKey` unik yang terdiri dari `namespace` (biasanya nama plugin berhuruf kecil) dan `key`:

```java
import org.bukkit.NamespacedKey;
import org.bukkit.plugin.Plugin;

public final class DataKeys {
    public static NamespacedKey CUSTOM_ID;
    public static NamespacedKey COOLDOWN_TIMESTAMP;
    public static NamespacedKey ITEM_STATS;

    public static void init(Plugin plugin) {
        CUSTOM_ID = new NamespacedKey(plugin, "custom_id");
        COOLDOWN_TIMESTAMP = new NamespacedKey(plugin, "cooldown_timestamp");
        ITEM_STATS = new NamespacedKey(plugin, "item_stats");
    }
}
```

---

## 2. Menyimpan & Membaca Tipe Data Primitif

PDC mendukung berbagai tipe bawaan melalui enum `PersistentDataType`:
- `PersistentDataType.STRING`
- `PersistentDataType.INTEGER`
- `PersistentDataType.LONG`
- `PersistentDataType.DOUBLE`
- `PersistentDataType.FLOAT`
- `PersistentDataType.BYTE` (boolean sering disimpan sebagai byte `1` / `0`)
- `PersistentDataType.BYTE_ARRAY`
- `PersistentDataType.TAG_CONTAINER` (PDC bersarang / nested)

### Contoh Menyimpan Data pada ItemStack:
```java
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

public ItemStack createTeleportWand(String wandId) {
    ItemStack wand = new ItemStack(Material.BLAZE_ROD);
    ItemMeta meta = wand.getItemMeta();
    if (meta != null) {
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        pdc.set(DataKeys.CUSTOM_ID, PersistentDataType.STRING, wandId);
        pdc.set(DataKeys.COOLDOWN_TIMESTAMP, PersistentDataType.LONG, System.currentTimeMillis());
        wand.setItemMeta(meta);
    }
    return wand;
}
```

### Contoh Membaca & Memvalidasi Data pada ItemStack:
```java
public boolean isCustomWand(ItemStack item) {
    if (item == null || !item.hasItemMeta()) return false;
    
    PersistentDataContainer pdc = item.getItemMeta().getPersistentDataContainer();
    return pdc.has(DataKeys.CUSTOM_ID, PersistentDataType.STRING);
}

public String getWandId(ItemStack item) {
    if (!isCustomWand(item)) return null;
    return item.getItemMeta().getPersistentDataContainer().get(DataKeys.CUSTOM_ID, PersistentDataType.STRING);
}
```

---

## 3. Menyimpan Data pada Entitas dan Chunk

PDC juga dapat diakses langsung pada entitas dan chunk tanpa meta terpisah:

```java
import org.bukkit.entity.Entity;
import org.bukkit.Chunk;

// Menandai entitas khusus (misal Custom Boss)
public void markAsCustomBoss(Entity entity, String bossType) {
    entity.getPersistentDataContainer().set(DataKeys.CUSTOM_ID, PersistentDataType.STRING, bossType);
}

// Menandai chunk yang telah diproses oleh plugin
public void markChunkProcessed(Chunk chunk) {
    chunk.getPersistentDataContainer().set(new NamespacedKey("myplugin", "processed"), PersistentDataType.BYTE, (byte) 1);
}
```

---

## 4. Tipe Data Kustom (Complex Object Serialization)

Kita dapat mengimplementasikan antarmuka `PersistentDataType<T, Z>` kustom untuk menyimpan objek kompleks (seperti record/POJO) ke dalam PDC tanpa perlu serialisasi JSON manual di setiap panggilan.

### Contoh Record Objek:
```java
public record ItemStats(int damageBonus, double critChance, int durability) {}
```

### Implementasi `PersistentDataType` Kustom:
```java
import org.bukkit.persistence.PersistentDataAdapterContext;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.NamespacedKey;

public final class ItemStatsDataType implements PersistentDataType<PersistentDataContainer, ItemStats> {

    private final NamespacedKey damageKey;
    private final NamespacedKey critKey;
    private final NamespacedKey durabilityKey;

    public ItemStatsDataType(org.bukkit.plugin.Plugin plugin) {
        this.damageKey = new NamespacedKey(plugin, "damage");
        this.critKey = new NamespacedKey(plugin, "crit");
        this.durabilityKey = new NamespacedKey(plugin, "durability");
    }

    @Override
    public Class<PersistentDataContainer> getPrimitiveType() {
        return PersistentDataContainer.class;
    }

    @Override
    public Class<ItemStats> getComplexType() {
        return ItemStats.class;
    }

    @Override
    public PersistentDataContainer toPrimitive(ItemStats complex, PersistentDataAdapterContext context) {
        PersistentDataContainer container = context.newPersistentDataContainer();
        container.set(damageKey, PersistentDataType.INTEGER, complex.damageBonus());
        container.set(critKey, PersistentDataType.DOUBLE, complex.critChance());
        container.set(durabilityKey, PersistentDataType.INTEGER, complex.durability());
        return container;
    }

    @Override
    public ItemStats fromPrimitive(PersistentDataContainer primitive, PersistentDataAdapterContext context) {
        int damage = primitive.getOrDefault(damageKey, PersistentDataType.INTEGER, 0);
        double crit = primitive.getOrDefault(critKey, PersistentDataType.DOUBLE, 0.0);
        int durability = primitive.getOrDefault(durabilityKey, PersistentDataType.INTEGER, 100);
        return new ItemStats(damage, crit, durability);
    }
}
```

### Penggunaan Langsung:
```java
ItemStats stats = new ItemStats(25, 0.15, 500);
pdc.set(DataKeys.ITEM_STATS, new ItemStatsDataType(plugin), stats);

// Membaca kembali:
ItemStats loadedStats = pdc.get(DataKeys.ITEM_STATS, new ItemStatsDataType(plugin));
```

---

## 5. Best Practices PDC
1. **Gunakan Singleton Keys**: Jangan instansiasi `new NamespacedKey(...)` berulang kali di hot-loop (seperti `EntityDamageByEntityEvent`); simpan sebagai static final constants.
2. **Namespace Konsisten**: Selalu gunakan plugin instance untuk key namespace agar tidak terjadi tabrakan dengan plugin lain.
3. **Pembersihan Data**: Hapus data yang tidak lagi valid menggunakan `pdc.remove(key)` untuk menghemat ukuran file world/NBT.
