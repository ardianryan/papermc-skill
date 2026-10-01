# Best Practices & Performance Optimization for Paper Plugins

Building Minecraft server plugins for large communities requires high efficiency, zero memory leaks, and non-blocking game tick loops. This guide summarizes essential rules, performance optimizations, and anti-patterns.

---

## 1. Preventing Memory Leaks

Minecraft exhibits a tightly coupled object graph. Holding Bukkit object references in memory beyond their intended lifecycle prevents the JVM Garbage Collector (GC) from clearing hundreds of megabytes of world and connection data.

### 🔴 Anti-Pattern: Holding Bukkit Objects in Static Collections
```java
// CRITICAL HAZARD: Player objects hold references to World, Chunks, and Network Connections
public static final Set<Player> activePlayers = new HashSet<>();
public static final Map<Player, PlayerData> dataMap = new HashMap<>();
```
When a player disconnects, the `Player` instance cannot be garbage-collected, creating a massive memory leak!

### 🟢 Solution: Store `UUID` Primitives
```java
// SAFE: UUID is a lightweight 16-byte identifier with zero lingering references
public static final Set<UUID> activePlayerUuids = new HashSet<>();
public static final Map<UUID, PlayerData> dataMap = new ConcurrentHashMap<>();

// Retrieve player instance only when needed:
Player player = Bukkit.getPlayer(uuid);
if (player != null) {
    // Process player
}
```

> **Golden Rule**: Never retain long-lived references to `Player`, `Entity`, `World`, `Chunk`, or `Block` instances in static fields. Use `UUID`, `NamespacedKey`, or primitive coordinates (`worldName`, `x`, `y`, `z`).

---

## 2. Asynchronous I/O & Database Operations

Server game ticks run in ~50 milliseconds (20 TPS). File I/O, heavy disk reads, HTTP web requests, or database queries taking even 100ms will immediately cause TPS drops and server lag spikes.

### 🟢 Solution: Async Threads & CompletableFuture
```java
import java.util.concurrent.CompletableFuture;
import org.bukkit.Bukkit;

public CompletableFuture<PlayerData> loadDataAsync(UUID uuid) {
    return CompletableFuture.supplyAsync(() -> {
        // Runs off the main game thread
        return database.fetchUser(uuid);
    }, myPluginThreadPool).thenApply(data -> {
        return data != null ? data : new PlayerData(uuid);
    });
}

// Consuming the result safely:
loadDataAsync(player.getUniqueId()).thenAccept(data -> {
    // Schedule back to the player's entity scheduler when mutating game state:
    player.getScheduler().run(plugin, task -> {
        player.giveExp(data.getPendingExp());
    }, null);
});
```

---

## 3. Eliminating Synchronous Chunk Loading

Invoking `world.getChunkAt(x, z)` or `location.getBlock()` on an unloaded chunk forces the server to read chunk data synchronously from disk, freezing the main tick thread.

### 🔴 Anti-Pattern
```java
Chunk chunk = world.getChunkAt(x, z); // Freezes the server if the chunk is not yet loaded!
```

### 🟢 Paper Solution: Asynchronous Chunk Loading
Use Paper's native `getChunkAtAsync`:

```java
world.getChunkAtAsync(x, z, true).thenAccept(chunk -> {
    // Chunk loaded asynchronously without TPS drops
    processChunkBlocks(chunk);
});
```

---

## 4. Robust Configuration (`config.yml`) Handling

In Paper, YAML files default to UTF-8 encoding. Read and reload configuration files cleanly:

```java
// Save embedded default config from jar if missing
saveDefaultConfig();

// Reload configuration
reloadConfig();
FileConfiguration config = getConfig();

// Read messages with fallback defaults
String rawMessage = config.getString("messages.welcome", "<green>Welcome to the server!</green>");
Component message = MiniMessage.miniMessage().deserialize(rawMessage);
```

For large configuration trees, consider using **Configurate** (`org.spongepowered:configurate-yaml`) which preserves file comments, validates schemas, and maps automatically to Java records.

---

## 5. Anti-Pattern Summary Checklist

| Never Do This ❌ | Recommended Modern Pattern ✔️ |
| :--- | :--- |
| `ChatColor.RED + "Text"` | `MiniMessage.miniMessage().deserialize("<red>Text</red>")` |
| `player.sendMessage("§a...")` | `player.sendMessage(Component)` |
| `new NamespacedKey(...)` in event loops | Define `NamespacedKey` instances as `static final` |
| Random `world.getBlockAt(x, y, z)` in async threads | Access blocks exclusively on the owning region thread |
| Ignoring `paper-plugin.yml` in new projects | Adopt `paper-plugin.yml` and `PluginBootstrap` |
| Blocking the tick thread with database queries | Use connection pools (HikariCP) & async futures |
| Omitting `folia-supported` declarations | Architect schedulers using region/universal abstractions |
