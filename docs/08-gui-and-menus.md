# Pembuatan GUI / Menu Inventory Modern di Paper

Membuat antarmuka interaktif (GUI Menu) menggunakan inventaris chest adalah salah satu fitur paling sering dibuat di plugin Minecraft. Pendekatan lama yang memeriksa judul GUI dengan string berwarna (`ChatColor.stripColor`) atau mencocokkan nomor slot sangat rapuh dan rawan bug duplikasi item.

Paper modern menawarkan cara yang jauh lebih aman, bersih, dan type-safe menggunakan **Kyori Adventure** dan **PersistentDataContainer (PDC)**.

---

## 1. Masalah pada Pendekatan Lama vs Solusi Modern

| Masalah Legacy (Lama) | Solusi Modern Paper |
| :--- | :--- |
| Memeriksa judul menu dengan `event.getView().getTitle().equals("§8Menu")` | Memeriksa `InventoryHolder` kustom atau PDC metadata pada item. |
| Mencocokkan fungsi tombol berdasarkan `event.getSlot() == 13` | Menandai tombol dengan `PDC` (`NamespacedKey: "gui_action" -> "buy_item"`). |
| Merusak format warna teks jika ada reload atau translate | Menggunakan Adventure `Component` untuk title inventaris. |
| Rawan bug eksploitasi duplikasi jika `event.setCancelled(true)` luput | Selalu batalkan event jika holder terverifikasi sebagai custom GUI. |

---

## 2. Pola Custom `InventoryHolder`

Cara paling handal dan standar industri untuk mengenali GUI buatan plugin Anda adalah membuat kelas yang mengimplementasikan `InventoryHolder`:

```java
package com.example.plugin.gui;

import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.jetbrains.annotations.NotNull;

public class CustomMenuHolder implements InventoryHolder {

    private final Inventory inventory;
    private final String menuId;

    public CustomMenuHolder(Component title, int rows, String menuId) {
        this.menuId = menuId;
        // Bukkit.createInventory mendukung Adventure Component secara native di Paper
        this.inventory = Bukkit.createInventory(this, rows * 9, title);
    }

    public String getMenuId() {
        return menuId;
    }

    @Override
    public @NotNull Inventory getInventory() {
        return inventory;
    }
}
```

---

## 3. Membuat Tombol dengan Penanda PDC

Daripada mengingat nomor slot, tandai setiap item tombol dengan aksi spesifik di `PersistentDataContainer`:

```java
package com.example.plugin.gui;

import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.Plugin;

import java.util.List;

public final class GuiItemBuilder {

    public static final NamespacedKey ACTION_KEY = new NamespacedKey("myplugin", "gui_action");

    public static ItemStack createButton(Material material, String nameMiniMessage, List<String> loreMiniMessage, String actionId) {
        ItemStack item = new ItemStack(material);
        ItemMeta meta = item.getItemMeta();
        if (meta != null) {
            meta.displayName(MiniMessage.miniMessage().deserialize(nameMiniMessage));
            
            meta.lore(loreMiniMessage.stream()
                .map(line -> MiniMessage.miniMessage().deserialize(line))
                .toList()
            );

            // Tandai tombol dengan ID aksi unik
            meta.getPersistentDataContainer().set(ACTION_KEY, PersistentDataType.STRING, actionId);
            item.setItemMeta(meta);
        }
        return item;
    }
}
```

---

## 4. Merakit Menu

```java
public void openShopMenu(Player player) {
    CustomMenuHolder holder = new CustomMenuHolder(
        MiniMessage.miniMessage().deserialize("<gradient:#f12711:#f5af19><bold>Toko Server</bold></gradient>"),
        3, // 3 baris = 27 slot
        "server_shop"
    );
    Inventory inv = holder.getInventory();

    // Border pengisi (filler)
    ItemStack filler = GuiItemBuilder.createButton(
        Material.GRAY_STAINED_GLASS_PANE,
        "<gray> </gray>",
        List.of(),
        "noop" // No operation
    );
    for (int i = 0; i < inv.getSize(); i++) {
        inv.setItem(i, filler);
    }

    // Tombol aksi
    inv.setItem(11, GuiItemBuilder.createButton(
        Material.DIAMOND_SWORD,
        "<aqua><bold>Beli Senjata Legendaris</bold></aqua>",
        List.of("<gray>Harga: <gold>500 Koin</gold></gray>", "<yellow>Klik untuk membeli!</yellow>"),
        "buy_sword"
    ));

    inv.setItem(15, GuiItemBuilder.createButton(
        Material.BARRIER,
        "<red><bold>Tutup Menu</bold></red>",
        List.of("<gray>Klik untuk keluar</gray>"),
        "close_menu"
    ));

    player.openInventory(inv);
}
```

---

## 5. Event Listener Menu yang Aman dari Eksploitasi

```java
package com.example.plugin.gui;

import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;

public final class MenuClickListener implements Listener {

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onInventoryClick(InventoryClickEvent event) {
        // 1. Verifikasi apakah inventory yang diklik adalah custom holder kita
        if (!(event.getInventory().getHolder() instanceof CustomMenuHolder holder)) {
            return;
        }

        // 2. SELALU batalkan klik untuk mencegah pemain mengambil/memindahkan item GUI!
        event.setCancelled(true);

        // 3. Abaikan jika klik di luar jendela atau slot kosong
        ItemStack clickedItem = event.getCurrentItem();
        if (clickedItem == null || !clickedItem.hasItemMeta()) {
            return;
        }

        if (!(event.getWhoClicked() instanceof Player player)) {
            return;
        }

        // 4. Baca aksi dari PDC item
        String action = clickedItem.getItemMeta().getPersistentDataContainer()
            .get(GuiItemBuilder.ACTION_KEY, PersistentDataType.STRING);

        if (action == null || action.equals("noop")) {
            return;
        }

        // 5. Eksekusi aksi berdasarkan action ID
        switch (action) {
            case "buy_sword" -> {
                player.sendMessage(MiniMessage.miniMessage().deserialize("<green>Sukses membeli senjata!</green>"));
                player.closeInventory();
            }
            case "close_menu" -> player.closeInventory();
            default -> player.sendMessage(MiniMessage.miniMessage().deserialize("<red>Aksi tidak dikenal.</red>"));
        }
    }
}
```
