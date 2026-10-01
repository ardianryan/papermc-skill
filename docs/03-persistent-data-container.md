# PersistentDataContainer (PDC) in Modern Paper

`PersistentDataContainer` (PDC) is the official, type-safe Bukkit/Paper API for storing custom persistent metadata directly on in-game Minecraft objects, including:
- **ItemStacks (`ItemMeta`)**
- **Entities (`Entity`, `LivingEntity`, `Player`)**
- **Block States / Tile Entities (`TileState`)**
- **Chunks (`Chunk`)**
- **Worlds (`World`)**

PDC eliminates brittle dependencies on legacy third-party NBT libraries (like NBTAPI) or parsing hidden lore strings. Data placed in PDC is serialized natively into Minecraft's vanilla NBT and automatically saved and loaded alongside world saves.

---

## 1. Key Concept: NamespacedKey

Every value stored in PDC is addressed by a unique `NamespacedKey` comprising a `namespace` (typically your lowercase plugin name) and a `key` identifier:

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

## 2. Storing & Reading Primitive Data Types

PDC supports standard primitive types via the `PersistentDataType` interface:
- `PersistentDataType.STRING`
- `PersistentDataType.INTEGER`
- `PersistentDataType.LONG`
- `PersistentDataType.DOUBLE`
- `PersistentDataType.FLOAT`
- `PersistentDataType.BYTE` (booleans are stored as byte `1` / `0`)
- `PersistentDataType.BYTE_ARRAY`
- `PersistentDataType.TAG_CONTAINER` (nested PDC structures)

### Example: Storing Metadata on an ItemStack
```java
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

public ItemStack createTeleportWand(String wandId) {
    ItemStack wand = new ItemStack(Material.BLAZE_ROD);
    wand.editMeta(meta -> {
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        pdc.set(DataKeys.CUSTOM_ID, PersistentDataType.STRING, wandId);
        pdc.set(DataKeys.COOLDOWN_TIMESTAMP, PersistentDataType.LONG, System.currentTimeMillis());
    });
    return wand;
}
```

### Example: Reading & Validating ItemStack Metadata
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

## 3. Storing Metadata on Entities and Chunks

PDC is accessible directly on entities and chunks without wrapping metadata:

```java
import org.bukkit.entity.Entity;
import org.bukkit.Chunk;
import org.bukkit.NamespacedKey;
import org.bukkit.persistence.PersistentDataType;

// Tagging custom entities (e.g. Dungeon Boss)
public void markAsCustomBoss(Entity entity, String bossType) {
    entity.getPersistentDataContainer().set(DataKeys.CUSTOM_ID, PersistentDataType.STRING, bossType);
}

// Tagging chunks processed by your world generation systems
public void markChunkProcessed(Chunk chunk, NamespacedKey key) {
    chunk.getPersistentDataContainer().set(key, PersistentDataType.BYTE, (byte) 1);
}
```

---

## 4. Custom Complex Data Types (`PersistentDataType<T, Z>`)

You can implement custom `PersistentDataType<T, Z>` adapters to store complex Java objects (such as records or POJOs) directly into PDC without manual JSON conversions on every invocation.

### Object Record:
```java
public record ItemStats(int damageBonus, double critChance, int durability) {}
```

### Custom `PersistentDataType` Adapter:
```java
import org.bukkit.NamespacedKey;
import org.bukkit.persistence.PersistentDataAdapterContext;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.Plugin;

public final class ItemStatsDataType implements PersistentDataType<PersistentDataContainer, ItemStats> {

    private final NamespacedKey damageKey;
    private final NamespacedKey critKey;
    private final NamespacedKey durabilityKey;

    public ItemStatsDataType(Plugin plugin) {
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

### Usage:
```java
ItemStats stats = new ItemStats(25, 0.15, 500);
pdc.set(DataKeys.ITEM_STATS, new ItemStatsDataType(plugin), stats);

// Read back:
ItemStats loadedStats = pdc.get(DataKeys.ITEM_STATS, new ItemStatsDataType(plugin));
```

---

## 5. PDC Best Practices
1. **Singleton Keys**: Never instantiate `new NamespacedKey(...)` repeatedly in hot event loops; define static final constants.
2. **Consistent Namespaces**: Always use your plugin instance namespace to prevent collisions with third-party plugins.
3. **Data Cleanup**: Clean up stale metadata using `pdc.remove(key)` to minimize world save file sizes.
