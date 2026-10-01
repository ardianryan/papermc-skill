# Event System & Paper Listeners

The event bus is Paper's primary reactive mechanism for responding to player interactions, world updates, entity behaviors, and server lifecycle states. Paper provides exclusive high-performance events along with native Kyori Adventure Component integration.

---

## 1. Anatomy of a Modern Listener

Listeners implement the `org.bukkit.event.Listener` interface and decorate handler methods with `@EventHandler`:

```java
import org.bukkit.event.Listener;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.java.JavaPlugin;
import net.kyori.adventure.text.minimessage.MiniMessage;

public final class PlayerJoinListener implements Listener {

    private final JavaPlugin plugin;

    public PlayerJoinListener(JavaPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.NORMAL, ignoreCancelled = true)
    public void onPlayerJoin(PlayerJoinEvent event) {
        // Paper natively uses Adventure Components for join messages
        event.joinMessage(
            MiniMessage.miniMessage().deserialize(
                "<gray>[<green>+</green>] <yellow>" + event.getPlayer().getName() + "</yellow> joined the server!</gray>"
            )
        );
    }
}
```

### Understanding `EventPriority`:
Execution sequence from first to last:
1. `LOWEST` (Runs first, ideal for raw observation or early preprocessing)
2. `LOW`
3. `NORMAL` (Default priority)
4. `HIGH`
5. `HIGHEST` (Runs last before final decision)
6. `MONITOR` (**READ-ONLY / LOGGING ONLY**; strictly forbidden from modifying or cancelling events, as downstream plugins cannot observe changes).

> **Important**: Always specify `ignoreCancelled = true` if your listener does not need to process interactions already prevented by land protection plugins (such as WorldGuard or GriefPrevention).

---

## 2. Modern Paper-Exclusive Events

Paper introduces modern, high-performance replacements for legacy Bukkit events:

### `AsyncChatEvent` (Replaces `AsyncPlayerChatEvent`)
Paper's `io.papermc.paper.event.player.AsyncChatEvent` operates directly with `Component` and MiniMessage:

```java
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;

@EventHandler
public void onChat(AsyncChatEvent event) {
    // Format chat messages cleanly using Adventure
    event.renderer((source, sourceDisplayName, message, viewer) -> 
        MiniMessage.miniMessage().deserialize("<gray>[Member] </gray>")
            .append(sourceDisplayName)
            .append(Component.text(": "))
            .append(message)
    );
}
```

### `PrePlayerAttackEntityEvent`
Fires prior to vanilla attack calculations. Essential for custom combat mechanics, weapon cooldown verification, or anti-griefing checks.

### `ServerTickStartEvent` & `ServerTickEndEvent`
Provides cycle-accurate server performance metrics per-tick without adding scheduler overhead.

---

## 3. Creating Custom Events

You can create custom events to expose an extensible public API for other plugins (following the design of LuckPerms or WorldGuard):

### Custom Event Example:
```java
package com.example.plugin.event;

import org.bukkit.entity.Player;
import org.bukkit.event.Cancellable;
import org.bukkit.event.Event;
import org.bukkit.event.HandlerList;
import org.jetbrains.annotations.NotNull;

public final class PlayerLevelUpEvent extends Event implements Cancellable {

    private static final HandlerList HANDLERS = new HandlerList();
    private final Player player;
    private final int newLevel;
    private boolean cancelled = false;

    public PlayerLevelUpEvent(Player player, int newLevel) {
        // false for synchronous execution on main/region thread, true for asynchronous
        super(false);
        this.player = player;
        this.newLevel = newLevel;
    }

    public Player getPlayer() {
        return player;
    }

    public int getNewLevel() {
        return newLevel;
    }

    @Override
    public boolean isCancelled() {
        return cancelled;
    }

    @Override
    public void setCancelled(boolean cancel) {
        this.cancelled = cancel;
    }

    @NotNull
    @Override
    public HandlerList getHandlers() {
        return HANDLERS;
    }

    @NotNull
    public static HandlerList getHandlerList() {
        return HANDLERS;
    }
}
```

### Dispatching the Custom Event:
```java
PlayerLevelUpEvent event = new PlayerLevelUpEvent(player, 10);
Bukkit.getPluginManager().callEvent(event);

if (!event.isCancelled()) {
    player.sendActionBar(MiniMessage.miniMessage().deserialize("<green>Congratulations, you leveled up!</green>"));
}
```

---

## 4. Listener Unregistration & Memory Hygiene

To prevent memory leaks across plugin reload or disable cycles:
- All listeners registered via `pluginManager.registerEvents(listener, this)` are unregistered automatically upon `onDisable()`.
- If you register dynamic short-lived listeners (such as for a temporary minigame session), unregister them explicitly upon session completion:
  ```java
  HandlerList.unregisterAll(matchListener);
  ```
