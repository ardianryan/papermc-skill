# Concurrency, Threading & Folia Multi-Thread Compatibility

One of the most revolutionary milestones in the PaperMC ecosystem is the emergence of **Folia**. Folia breaks Minecraft's monolithic "Server Main Thread" into hundreds of independent regional threads (**Threaded Regions**).

Consequently, legacy Bukkit concurrency assumptions like `Bukkit.getScheduler()` or mutating world state from arbitrary threads result in **`IllegalStateException` crashes or data corruption** on Folia.

---

## 1. Threading Architecture: Bukkit vs Paper vs Folia

```
[Bukkit / Vanilla]
Single Main Thread ─── Ticks All Worlds, Entities, Blocks, Redstone, AI, Chunks ───>

[Folia Regionized Multi-Threading]
Region Thread 1  ─── Ticks Overworld Region A (Chunks 0..32, 0..32) ───>
Region Thread 2  ─── Ticks Overworld Region B (Chunks 64..96, 64..96) ──>
Region Thread 3  ─── Ticks Nether Region C ────────────────────────────>
Global Thread    ─── Ticks Weather, Time, Player List, Commands ───────>
Async Threads    ─── Network I/O, File Saving, Database Queries ────────>
```

In Folia:
- There is no single "Main Thread".
- `World`, `Entity`, and `Block` instances may only be queried or mutated on the **region thread owning that coordinate/chunk**.
- Accessing an entity from a foreign region thread throws `IllegalStateException: Plugin attempted to access entity from wrong thread`.

---

## 2. Modern Scheduler Hierarchy in Paper & Folia

Paper introduces clean scheduler primitives that operate seamlessly across both multi-threaded Folia and single-threaded Paper:

### 1. `RegionScheduler`
Used to execute tasks bound to specific world coordinates or chunks:

```java
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.plugin.Plugin;

Location loc = player.getLocation();

// Run a one-time task on the region thread owning this location
Bukkit.getRegionScheduler().execute(plugin, loc, () -> {
    loc.getBlock().setType(org.bukkit.Material.GOLD_BLOCK);
});

// Run a repeating task on the region thread
Bukkit.getRegionScheduler().runAtFixedRate(plugin, loc, task -> {
    loc.getWorld().spawnParticle(org.bukkit.Particle.FLAME, loc, 5);
}, 20L, 20L); // 20 ticks initial delay, 20 ticks period
```

### 2. `EntityScheduler`
Every `Entity` owns its own dedicated scheduler. Tasks execute directly on whichever region thread the entity currently occupies, even across chunk border transitions:

```java
player.getScheduler().run(plugin, task -> {
    player.giveExp(10);
    player.sendMessage("Bonus EXP received!");
}, () -> {
    // Retired callback if entity is dead or invalidated before execution
    plugin.getLogger().warning("Player disconnected before reward was applied.");
});
```

### 3. `GlobalRegionScheduler`
Used for server-wide tasks unconfined to specific coordinates (e.g., global announcements, world time, or weather):

```java
Bukkit.getGlobalRegionScheduler().runAtFixedRate(plugin, task -> {
    Bukkit.broadcast(MiniMessage.miniMessage().deserialize("<gold>[Announcement] Join our Discord server!</gold>"));
}, 100L, 1200L);
```

### 4. `AsyncScheduler`
Used for I/O, database interactions, HTTP calls, and non-Bukkit mathematical computations. Operates using wall-clock time (`java.time.TimeUnit`) rather than game ticks:

```java
import java.util.concurrent.TimeUnit;

Bukkit.getAsyncScheduler().runDelayed(plugin, task -> {
    // Run database query off the game thread
    database.savePlayerData(uuid, data);
}, 5, TimeUnit.SECONDS);
```

---

## 3. Universal Scheduler Abstraction Pattern (Paper + Folia)

Most production plugins must run identically on standard single-threaded Paper and multi-threaded Folia. The recommended approach is an abstraction layer (as pioneered by **Chunky** and **squaremap**):

```java
public final class UniversalScheduler {

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

    public static void runAtLocation(Plugin plugin, Location location, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getRegionScheduler().execute(plugin, location, runnable);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    public static void runForEntity(Plugin plugin, Entity entity, Runnable runnable) {
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

## 4. Mandatory Folia Compatibility Rules

1. **Declare Compatibility in Manifest**:
   Always include `folia-supported: true` in `paper-plugin.yml`. Without this, Folia flags your plugin as potentially hazardous upon boot.
2. **Never Read Chunks/Blocks Synchronously Off-Thread**:
   Always invoke `world.getChunkAtAsync(x, z)` which returns a `CompletableFuture<Chunk>`.
3. **Use TeleportAsync**:
   Always call `entity.teleportAsync(location)` instead of `entity.teleport(location)`. Across Folia, cross-region movement must be processed asynchronously.
4. **Avoid Global Mutable Static Collections**:
   Static lists of active players or entities experience severe race conditions when mutated by multiple region threads concurrently. Use thread-safe structures (`ConcurrentHashMap`) or delegate state to player PDC.
