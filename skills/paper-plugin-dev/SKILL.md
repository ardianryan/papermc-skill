---
name: paper-plugin-dev
description: Expert guidelines, modern architectural blueprints, exploit-prevention patterns, and best practices for developing production-grade Minecraft Java plugins using PaperMC API (1.20-1.21+ / 26.x), Folia (Threaded Regions), Adventure API, MiniMessage, and Data Components.
---

# Paper & Folia Minecraft Plugin Development Skill

This skill provides authoritative architectural standards, high-level exploit-prevention blueprints, and modern design patterns for building and auditing Minecraft Java server plugins based on **PaperMC (1.20.6, 1.21+ through 26.x)** and **Folia (Regionized Multi-Threading)**.

---

## 1. Environment Prerequisites & Compatibility Matrix

| Component | Minimum Standard | Current Recommendation | Critical Notes |
| :--- | :--- | :--- | :--- |
| **Java SDK** | **Java 21 (LTS)** | **Java 21 LTS** / Java 25 Ready | Minecraft 1.20.5+ and modern Paper **require** Java 21+. Target Paper 26.x requires Java 25+. |
| **Build Tool** | Gradle 8.10+ | **Gradle 9.7+ (Kotlin DSL)** | Use `jvmToolchain(21)` and `pluginManagement { mavenCentral() }`. |
| **Paper API** | `1.21.4-R0.1-SNAPSHOT` | `1.21.11-R0.1-SNAPSHOT` | Repository: `https://repo.papermc.io/repository/maven-public/` |
| **API Discovery** | Manual | **PaperMC Fill v3 API** | Query real-time versions via `https://fill.papermc.io/v3/projects/paper`. |
| **Text Handling** | Adventure 4.17+ | **Kyori Adventure + MiniMessage** | Never use `org.bukkit.ChatColor` or the legacy section sign `§`. |

---

## 2. Standard AI Coding Agent Workflow

When requested to scaffold, modify, or review a Paper/Folia plugin codebase:

1. **Version Discovery & Target Verification**:
   - Run `npx papermc-skill check-update` or query the Fill v3 API to determine current supported Paper builds and minimum Java requirements.
2. **Configure Modern Plugin Manifest (`paper-plugin.yml`)**:
   - Must declare `folia-supported: true`.
   - Specify `bootstrapper:` for early lifecycle handling and Brigadier command registration.
3. **Select Safe Concurrency Architecture**:
   - Entity or Player state: `player.getScheduler()`.
   - Block, World, or Chunk state: `RegionScheduler`.
   - Global server state or announcements: `GlobalRegionScheduler`.
   - Database, File I/O, Web Requests, or compute-heavy math: `AsyncScheduler` or `CompletableFuture`.
4. **Enforce Exploit & Dupe Prevention Protocols (Mandatory)**:
   - Validate numeric user input (reject `NaN`, `Infinity`, overflow, and negative amounts).
   - Protect inventory menus against click-spam race conditions via debounce.
   - Store `UUID` rather than `Player` instances across all caches and static collections.
   - Secure custom items using `PersistentDataContainer` (PDC) signatures.
5. **Compile & Lint Verification**:
   - Verify build passes clean compilation with zero deprecation warnings.

---

## 3. Production Security & Exploit-Prevention Protocols

### A. Item Duplication & Inventory Transaction Safety
Duplication glitches almost always stem from race conditions across inventory events or async state mutations:
- **Absolute Rule**: Never modify a player's `Inventory` or `ItemStack` from an asynchronous thread! Always dispatch inventory mutations onto the player's entity scheduler (`player.getScheduler()`).
- **Debounce Click Spam**: Enforce a cooldown (e.g., 150-200ms) between clicks on custom GUIs to stop auto-clicker exploits.
- **Cursor Item Handling**: When a custom menu closes unexpectedly (`InventoryCloseEvent` or disconnection), ensure items on the player's cursor are safely returned to inventory rather than lost or duplicated.

### B. Economy & Numeric Input Sanitization (Anti-NaN & Anti-Overflow)
Many economy plugins suffer catastrophic exploits when players supply inputs like `/pay Player NaN`, `/pay Player -1000000`, or values exceeding standard 64-bit bounds:
- Always use `BigDecimal` or cents-based integer values for monetary storage.
- Always validate input:
  ```java
  if (!Double.isFinite(amount) || amount <= 0.0) {
      throw new IllegalArgumentException("Invalid transaction amount!");
  }
  ```

### C. PDC Anti-Tamper & Cryptographic Hashing
Cheating clients or players using anvils/crafting tables often attempt to forge custom item lore to impersonate rare server gear.
- **Rule**: Never identify a custom item by its `DisplayName` or `Lore`!
- Store immutable identifiers inside `PersistentDataContainer` (PDC).
- For high-value items, append an internal server HMAC hash or unique identifier to verify data integrity.

### D. Preventing Denial of Service via Synchronous Chunk Loading
Invoking `world.getBlockAt(x, y, z)` on ungenerated/unloaded far chunks (e.g., coordinate 30,000,000) freezes the entire main server thread for hundreds of milliseconds.
- Always check `world.isChunkLoaded(chunkX, chunkZ)` prior to synchronous access, or load asynchronously:
  ```java
  world.getChunkAtAsync(chunkX, chunkZ).thenAccept(chunk -> { ... });
  ```

### E. SQL Injection Defense & Pool Leak Prevention
- Never concatenate raw user input into SQL queries (`"SELECT * FROM users WHERE name = '" + input + "'"`).
- Always use `PreparedStatement` with placeholder queries (`?`).
- Use connection pooling (**HikariCP**) enclosed in `try-with-resources` blocks so connections return cleanly to the pool.

---

## 4. Modern Production Recipes

### Recipe 1: Folia-Ready Modern Manifest (`src/main/resources/paper-plugin.yml`)
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
```

### Recipe 2: Bootstrap Lifecycle & Modern Brigadier Command
Register commands through Paper's Lifecycle Events (Minecraft 1.20.6+ / 1.21+) without needing command entries in `plugin.yml`:

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

                                // Strict security sanitization
                                if (!Double.isFinite(amount) || amount <= 0) {
                                    sender.sendMessage(MiniMessage.miniMessage().deserialize("<red>Invalid payment amount!</red>"));
                                    return Command.SINGLE_SUCCESS;
                                }

                                sender.sendMessage(MiniMessage.miniMessage().deserialize(
                                    "<green>Sent <gold>$" + String.format("%.2f", amount) + "</gold> to <yellow>" + target + "</yellow>!</green>"
                                ));
                                return Command.SINGLE_SUCCESS;
                            })
                        )
                    )
                    .build(),
                "Secure player payment with anti-overflow validation",
                List.of("paysecure")
            );
        });
    }
}
```

### Recipe 3: Anti-Tamper PDC Item Utilities
```java
package com.example.plugin.util;

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

### Recipe 4: Anti-Dupe GUI Controller with Debounce
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

        // 1. Always cancel item movement
        event.setCancelled(true);

        if (!(event.getWhoClicked() instanceof Player player)) {
            return;
        }

        // 2. Click-spam protection (200ms debounce)
        long now = System.currentTimeMillis();
        long lastClick = clickDebounce.getOrDefault(player.getUniqueId(), 0L);
        if (now - lastClick < 200) {
            return;
        }
        clickDebounce.put(player.getUniqueId(), now);

        // 3. Process only top menu clicks
        if (event.getClickedInventory() == event.getInventory()) {
            handleSlotAction(player, event.getSlot());
        }
    }

    @EventHandler
    public void onDrag(InventoryDragEvent event) {
        if (event.getInventory().getHolder() instanceof SafeMenuController) {
            event.setCancelled(true);
        }
    }

    @EventHandler
    public void onClose(InventoryCloseEvent event) {
        if (event.getInventory().getHolder() instanceof SafeMenuController) {
            clickDebounce.remove(event.getPlayer().getUniqueId());
        }
    }

    private void handleSlotAction(Player player, int slot) {
        // Handle slot action safely
    }
}
```

### Recipe 5: Universal Folia & Paper Scheduler Adapter
Transparently dispatches execution safely whether running on standard Paper or multi-threaded Folia:

```java
package com.example.plugin.util;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Entity;
import org.bukkit.plugin.Plugin;

import java.util.concurrent.TimeUnit;

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

    /** Dispatches a task to the region scheduler owning the specified entity */
    public static void runForEntity(Plugin plugin, Entity entity, Runnable runnable) {
        if (IS_FOLIA) {
            entity.getScheduler().run(plugin, task -> runnable.run(), null);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    /** Dispatches a task to the region scheduler owning the specified location */
    public static void runAtLocation(Plugin plugin, Location location, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getRegionScheduler().execute(plugin, location, runnable);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    /** Dispatches a purely asynchronous task (I/O, database, networking) */
    public static void runAsync(Plugin plugin, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getAsyncScheduler().runNow(plugin, task -> runnable.run());
        } else {
            Bukkit.getScheduler().runTaskAsynchronously(plugin, runnable);
        }
    }

    /** Dispatches a delayed asynchronous task */
    public static void runAsyncDelayed(Plugin plugin, Runnable runnable, long delayMs) {
        if (IS_FOLIA) {
            Bukkit.getAsyncScheduler().runDelayed(plugin, task -> runnable.run(), delayMs, TimeUnit.MILLISECONDS);
        } else {
            long ticks = Math.max(1L, delayMs / 50L);
            Bukkit.getScheduler().runTaskLaterAsynchronously(plugin, runnable, ticks);
        }
    }
}
```

### Recipe 6: Robust Asynchronous Database Access (HikariCP)
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

## 5. Anti-Patterns vs Modern Standards

| Never Do This ❌ | Hazard / Vulnerability ⚠️ | Safe Modern Pattern ✔️ |
| :--- | :--- | :--- |
| `ChatColor.RED + "Message"` | Deprecated & breaks console/client formatting | `MiniMessage.miniMessage().deserialize("<red>Message</red>")` |
| `public static Set<Player> list;` | Causes massive **Memory Leaks** of worlds & connections | `public static Set<UUID> list;` |
| `world.getChunkAt(x, z)` in a loop | Freezes main server tick thread (major TPS drops) | `world.getChunkAtAsync(x, z)` |
| `Bukkit.getScheduler()` on Folia | Throws exception or causes thread-safety desync | Use `RegionScheduler`, `EntityScheduler`, or `UniversalScheduler` |
| Modifying inventories asynchronously | Causes item duplication and memory corruption | Always dispatch inventory modifications to entity region thread |
| Concatenating raw SQL queries | High vulnerability to **SQL Injection** | Always use `PreparedStatement` with `?` parameters |
| `new NamespacedKey(...)` in event loops | Excessive GC allocation pressure | Define constants as `public static final NamespacedKey` |
| Relying on item displayName/lore | Easily forged via anvils or modified clients | Always verify identity and attributes via **PDC** |
| Unbounded numbers in economy commands | Susceptible to `NaN`, negative amounts, and overflow | Validate `Double.isFinite()` and enforce minimum/maximum boundaries |

---

## 6. Pre-Release Security Audit Checklist

Prior to releasing a plugin to production or public servers:

- [ ] `paper-plugin.yml` is defined with `folia-supported: true`.
- [ ] Zero references to `org.bukkit.ChatColor` across the codebase.
- [ ] All command registration uses modern Brigadier (`LifecycleEvents.COMMANDS`).
- [ ] No direct storage of `Player`, `World`, or `Entity` instances in static collections.
- [ ] All File, Database, and HTTP operations execute 100% asynchronously.
- [ ] Custom GUIs implement `setCancelled(true)` and click debounce cooldowns.
- [ ] Custom items are identified and verified via `PersistentDataContainer` (PDC).
- [ ] All database queries use connection pooling enclosed in `try-with-resources`.
- [ ] Plugin compiles cleanly using Gradle 9.x targeting Java 21 LTS.
