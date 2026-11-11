---
name: paper-plugin-dev
description: Expert guidelines, modern architectural blueprints, exploit-prevention patterns, and best practices for developing production-grade Minecraft Java plugins using PaperMC API (1.20-1.21+ / 26.x), Folia (Threaded Regions), Adventure API, MiniMessage, Data Components, Display Entities, and Tricky Trials combat kinematics.
---

# Paper & Folia Minecraft Plugin Development Skill

This skill provides authoritative architectural standards, high-level exploit-prevention blueprints, and modern design patterns for building and auditing Minecraft Java server plugins based on **PaperMC (1.20.6, 1.21+ through 26.x)** and **Folia (Regionized Multi-Threading)**.

Compatible with all premier AI coding environments: **Antigravity (agy)**, **Claude Code**, **OpenAI Codex**, **Cursor**, **DeepSeek Harness**, **Paseo**, and **pi.dev**.

---

## 1. Environment Prerequisites & Compatibility Matrix

| Component | Minimum Standard | Current Recommendation | Critical Notes |
| :--- | :--- | :--- | :--- |
| **Java SDK** | **Java 21 (LTS)** | **Java 21 LTS** / Java 25 Ready | Minecraft 1.20.5+ and modern Paper require Java 21+. Target Paper 26.x requires Java 25+. |
| **Build Tool** | Gradle 8.10+ | **Gradle 9.x+ (Kotlin DSL)** | Use `jvmToolchain(21)` and `pluginManagement { mavenCentral() }`. |
| **Paper API** | `1.21.4-R0.1-SNAPSHOT` | `1.21.11-R0.1-SNAPSHOT` / `26.3.build.+` | Repository: `https://repo.papermc.io/repository/maven-public/` |
| **API Discovery** | Manual | **PaperMC Fill v3 API** | Query real-time versions via `https://fill.papermc.io/v3/projects/paper`. |
| **Text Handling** | Adventure 4.17+ | **Kyori Adventure + MiniMessage** | Never use `org.bukkit.ChatColor` or the legacy section sign `§`. |
| **Item Data** | Data Components (1.20.5+) | `io.papermc.paper.datacomponent` | Legacy NBT tags are completely deprecated. Use `DataComponentTypes`. |
| **Visuals/FX** | ArmorStands (Legacy) | **Display Entities (Text/Item/Block)** | Zero-tick lag, JOML `Matrix4f` smooth client-side interpolation. |

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
4. **Item & Data Component Modernization**:
   - Never use raw NBT manipulation. Mutate items through `DataComponentTypes` (e.g. `FOOD`, `TOOL`, `CUSTOM_MODEL_DATA`, `MAX_STACK_SIZE`).
5. **Zero-Lag Visual Displays**:
   - Replace outdated armor-stand floating holograms with `TextDisplay` and `ItemDisplay` using JOML matrix transformations.
6. **Enforce Exploit & Dupe Prevention Protocols (Mandatory)**:
   - Validate numeric user input (reject `NaN`, `Infinity`, overflow, and negative amounts).
   - Protect inventory menus against click-spam race conditions via debounce.
   - Store `UUID` rather than `Player` instances across all caches and static collections.
   - Secure custom items using `PersistentDataContainer` (PDC) signatures.
7. **Compile & Security Audit**:
   - Run `npx papermc-skill audit` to guarantee 0 vulnerabilities before releasing code.

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

## 4. Modern Overpowered (OP) Recipes

### Recipe 1: Folia-Ready Modern Manifest (`src/main/resources/paper-plugin.yml`)
```yaml
name: EpicPaperPlugin
version: '1.2.0'
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

### Recipe 3: Modern Data Component Item Engineering (Zero-NBT)
```java
package com.example.plugin.item;

import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.CustomModelData;
import io.papermc.paper.datacomponent.item.FoodProperties;
import io.papermc.paper.datacomponent.item.ItemLore;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;

import java.util.List;

public final class ModernItemBuilder {

    public static ItemStack createGodtierRelic() {
        ItemStack item = ItemStack.of(Material.NETHERITE_SWORD);

        // Type-safe direct component modification
        item.setData(DataComponentTypes.ITEM_NAME, Component.text("Aegis of the Void", NamedTextColor.LIGHT_PURPLE, TextDecoration.BOLD));
        item.setData(DataComponentTypes.LORE, ItemLore.lore(List.of(
            Component.text("Ancient relic harvested from trial chambers.", NamedTextColor.GRAY),
            Component.empty(),
            Component.text("✦ Ability: Kinetic Shockwave on hit", NamedTextColor.AQUA)
        )));

        // Modern 1.20.5+ Custom Model Data (floats, strings, flags)
        item.setData(DataComponentTypes.CUSTOM_MODEL_DATA, CustomModelData.customModelData()
            .addFloat(2.5f)
            .addString("aegis_void_model")
            .build()
        );

        // Overrides
        item.setData(DataComponentTypes.ENCHANTMENT_GLINT_OVERRIDE, true);
        item.setData(DataComponentTypes.MAX_STACK_SIZE, 1);
        item.setData(DataComponentTypes.UNBREAKABLE, true);

        return item;
    }
}
```

### Recipe 4: Zero-Lag Display Entity Hologram Engine
```java
package com.example.plugin.display;

import net.kyori.adventure.text.Component;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.entity.Display;
import org.bukkit.entity.TextDisplay;
import org.bukkit.util.Transformation;
import org.joml.AxisAngle4f;
import org.joml.Vector3f;

public final class DisplayHologramEngine {

    /** Spawns a floating holographic sign with smooth client-side interpolation */
    public static TextDisplay spawnSmoothHologram(Location loc, Component text) {
        return loc.getWorld().spawn(loc, TextDisplay.class, display -> {
            display.text(text);
            display.setBillboard(Display.Billboard.CENTER);
            display.setDefaultBackground(false);
            display.setBackgroundColor(Color.fromARGB(150, 20, 20, 30));
            display.setShadowed(true);

            // Client-side smooth interpolation (20 ticks = 1 second)
            display.setInterpolationDuration(20);
            display.setInterpolationDelay(0);

            // Transformation via JOML
            Transformation transform = new Transformation(
                new Vector3f(0f, 0f, 0f),
                new AxisAngle4f(0f, 0f, 1f, 0f),
                new Vector3f(1.1f, 1.1f, 1.1f),
                new AxisAngle4f(0f, 0f, 1f, 0f)
            );
            display.setTransformation(transform);
        });
    }
}
```

### Recipe 5: 1.21 Tricky Trials Mace & Combat Physics
```java
package com.example.plugin.combat;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.util.Vector;

public final class MaceKineticCombatListener implements Listener {

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onMaceSmash(EntityDamageByEntityEvent event) {
        if (!(event.getDamager() instanceof Player attacker)) return;
        if (!(event.getEntity() instanceof LivingEntity victim)) return;

        if (attacker.getInventory().getItemInMainHand().getType() != Material.MACE) return;

        float fallDistance = attacker.getFallDistance();
        if (fallDistance > 1.5f) {
            double extraDmg = Math.min(fallDistance * 3.5, 45.0);
            event.setDamage(event.getDamage() + extraDmg);

            Location loc = victim.getLocation();
            loc.getWorld().spawnParticle(Particle.TRIAL_SPAWNER_DETECTION, loc.add(0, 0.5, 0), 30, 0.5, 0.2, 0.5, 0.05);
            loc.getWorld().playSound(loc, Sound.ITEM_MACE_SMASH_GROUND, 1.2f, 1.0f);

            // Shockwave knockback
            loc.getWorld().getNearbyLivingEntities(loc, 4.5, e -> !e.equals(attacker) && !e.equals(victim))
                .forEach(e -> {
                    Vector impulse = e.getLocation().toVector().subtract(loc.toVector()).normalize().multiply(1.3).setY(0.4);
                    e.setVelocity(impulse);
                });

            attacker.sendActionBar(Component.text("⚡ SMASH IMPACT: +" + String.format("%.1f", extraDmg) + " DMG", NamedTextColor.GOLD));
        }
    }
}
```

### Recipe 6: Anti-Dupe GUI Controller with Debounce
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
        // Safe slot logic
    }
}
```

### Recipe 7: Universal Folia & Paper Scheduler Adapter
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

    public static void runForEntity(Plugin plugin, Entity entity, Runnable runnable) {
        if (IS_FOLIA) {
            entity.getScheduler().run(plugin, task -> runnable.run(), null);
        } else {
            Bukkit.getScheduler().runTask(plugin, runnable);
        }
    }

    public static void runAtLocation(Plugin plugin, Location location, Runnable runnable) {
        if (IS_FOLIA) {
            Bukkit.getRegionScheduler().execute(plugin, location, runnable);
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

---

## 5. Anti-Patterns vs Modern Standards

| Never Do This ❌ | Hazard / Vulnerability ⚠️ | Safe Modern Pattern ✔️ |
| :--- | :--- | :--- |
| `ChatColor.RED + "Message"` | Deprecated & breaks console/client formatting | `MiniMessage.miniMessage().deserialize("<red>Message</red>")` |
| `public static Set<Player> list;` | Causes massive **Memory Leaks** of worlds & connections | `public static Set<UUID> list;` |
| Direct NBT manipulation (`net.minecraft.nbt`) | Hard crashes on 1.20.5+ / 1.21+ / 26.x | `ItemStack#setData(DataComponentTypes.XXX)` |
| `ArmorStand` floating text holograms | Extreme entity ticking CPU overhead | `TextDisplay` with JOML interpolated transformations |
| `world.getChunkAt(x, z)` in a loop | Freezes main server tick thread (major TPS drops) | `world.getChunkAtAsync(x, z)` |
| `Bukkit.getScheduler()` on Folia | Throws exception or causes thread-safety desync | Use `RegionScheduler`, `EntityScheduler`, or `UniversalScheduler` |
| Modifying inventories asynchronously | Causes item duplication and memory corruption | Always dispatch inventory modifications to entity region thread |
| Concatenating raw SQL queries | High vulnerability to **SQL Injection** | Always use `PreparedStatement` with `?` parameters |
| Unbounded numbers in economy commands | Susceptible to `NaN`, negative amounts, and overflow | Validate `Double.isFinite()` and enforce minimum/maximum boundaries |

---

## 6. Pre-Release Security Audit Checklist

Prior to releasing a plugin to production or public servers:

- [ ] `paper-plugin.yml` is defined with `folia-supported: true`.
- [ ] Zero references to `org.bukkit.ChatColor` across the codebase.
- [ ] Direct NBT or legacy ItemMeta serialization replaced by `DataComponentTypes`.
- [ ] Holograms and floating 3D icons use `Display` entities rather than armor stands.
- [ ] All command registration uses modern Brigadier (`LifecycleEvents.COMMANDS`).
- [ ] No direct storage of `Player`, `World`, or `Entity` instances in static collections.
- [ ] All File, Database, and HTTP operations execute 100% asynchronously.
- [ ] Custom GUIs implement `setCancelled(true)` and click debounce cooldowns.
- [ ] Custom items are identified and verified via `PersistentDataContainer` (PDC).
- [ ] All database queries use connection pooling enclosed in `try-with-resources`.
- [ ] Plugin passes `npx papermc-skill audit` with zero issues.
