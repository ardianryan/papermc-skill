# Sistem Event & Listener di Paper

Sistem event adalah mekanisme reaktif utama di Paper untuk merespons aksi pemain, lingkungan dunia, entitas, dan siklus server. Paper menyediakan banyak event eksklusif berkinerja tinggi serta integrasi penuh dengan Adventure Component.

---

## 1. Anatomi Listener Standar

Listener mengimplementasikan antarmuka `org.bukkit.event.Listener` dan menggunakan anotasi `@EventHandler`:

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
        // Paper menggunakan Adventure Component untuk joinMessage
        event.joinMessage(
            MiniMessage.miniMessage().deserialize(
                "<gray>[<green>+</green>] <yellow>" + event.getPlayer().getName() + "</yellow> bergabung ke server!</gray>"
            )
        );
    }
}
```

### Memahami `EventPriority`:
Urutan eksekusi event dari pertama hingga terakhir:
1. `LOWEST` (dijalankan paling awal, bagus untuk observasi mentah)
2. `LOW`
3. `NORMAL` (default)
4. `HIGH`
5. `HIGHEST` (dijalankan paling akhir sebelum event final)
6. `MONITOR` (**HANYA UNTUK MEMBACA/LOGGING**; DILARANG memodifikasi atau membatalkan event di priority ini karena plugin lain tidak akan dapat merespons perubahan Anda).

> **Penting**: Selalu tambahkan `ignoreCancelled = true` jika listener Anda tidak perlu memproses aksi yang sudah dibatalkan oleh plugin proteksi area (seperti WorldGuard/GriefPrevention).

---

## 2. Event Modern Eksklusif Paper

Paper mengganti atau melengkapi beberapa event Bukkit lama dengan alternatif yang lebih efisien dan modern:

### `AsyncChatEvent` (Menggantikan `AsyncPlayerChatEvent`)
Paper menggunakan `io.papermc.paper.event.player.AsyncChatEvent` yang bekerja langsung dengan `Component` dan MiniMessage:

```java
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;

@EventHandler
public void onChat(AsyncChatEvent event) {
    // Memodifikasi format pesan dengan Adventure
    event.renderer((source, sourceDisplayName, message, viewer) -> 
        MiniMessage.miniMessage().deserialize("<gray>[Member] </gray>")
            .append(sourceDisplayName)
            .append(Component.text(": "))
            .append(message)
    );
}
```

### `PrePlayerAttackEntityEvent`
Dijalankan sebelum kalkulasi serangan vanilla terjadi. Sangat ideal untuk sistem combat kustom, cooldown attack senjata khusus, atau verifikasi proteksi PvP.

### `ServerTickStartEvent` & `ServerTickEndEvent`
Memonitor performa server secara presisi per-tick tanpa membebani scheduler.

---

## 3. Membuat Custom Event

Anda dapat membuat event sendiri untuk mengekspos API plugin Anda kepada developer lain (seperti yang dilakukan oleh LuckPerms atau WorldGuard).

### Contoh Custom Event:
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
        // false jika berjalan di main/region thread (Sync), true jika Async
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

### Memanggil (Dispatch) Event:
```java
PlayerLevelUpEvent event = new PlayerLevelUpEvent(player, 10);
Bukkit.getPluginManager().callEvent(event);

if (!event.isCancelled()) {
    // Lanjutkan aksi jika event tidak dibatalkan oleh plugin lain
    player.sendActionBar(MiniMessage.miniMessage().deserialize("<green>Selamat, Anda naik level!</green>"));
}
```

---

## 4. Unregistering Event & Pembersihan

Untuk mencegah memory leak saat reload atau saat plugin dinonaktifkan:
- Semua event yang didaftarkan melalui `pluginManager.registerEvents(listener, this)` otomatis di-unregister saat `onDisable()`.
- Jika Anda mendaftarkan event dinamis (misal per-minigame match), unregister secara manual ketika game selesai:
  ```java
  HandlerList.unregisterAll(matchListener);
  ```
