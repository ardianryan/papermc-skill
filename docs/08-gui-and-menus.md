# Modern GUI & Inventory Menus in Paper

Creating interactive inventory interfaces (GUI Menus) using chest containers is one of the most widely implemented features in Minecraft plugins. Legacy approaches inspecting menu titles with color strings (`ChatColor.stripColor`) or hardcoding slot numbers (`event.getSlot() == 13`) are brittle and notorious for causing item duplication exploits.

Modern Paper offers a clean, type-safe, and exploit-proof pattern utilizing **Kyori Adventure** and **PersistentDataContainer (PDC)**.

---

## 1. Legacy Anti-Patterns vs Modern Paper Solutions

| Legacy Spigot Anti-Pattern | Modern Paper Architecture |
| :--- | :--- |
| Matching title strings: `view.getTitle().equals("§8Menu")` | Verifying custom `InventoryHolder` or PDC item signatures. |
| Hardcoding actions: `if (event.getSlot() == 13)` | Tagging button items with PDC actions (`gui_action -> buy_item`). |
| Corrupting color formatting across reloads | Using Adventure `Component` titles natively. |
| Item duplication exploits when cancel fails | Enforcing immediate cancellation on verified custom holders. |

---

## 2. The Custom `InventoryHolder` Pattern

The industry standard for identifying plugin-owned GUIs is implementing a custom `InventoryHolder`:

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
        // Bukkit.createInventory natively accepts Adventure Components in Paper
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

## 3. Creating Interactive Buttons with PDC Tags

Rather than remembering slot indices, tag each button item with an action identifier inside `PersistentDataContainer`:

```java
package com.example.plugin.gui;

import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;

import java.util.List;

public final class GuiItemBuilder {

    public static final NamespacedKey ACTION_KEY = new NamespacedKey("myplugin", "gui_action");

    public static ItemStack createButton(Material material, String nameMiniMessage, List<String> loreMiniMessage, String actionId) {
        ItemStack item = new ItemStack(material);
        item.editMeta(meta -> {
            meta.displayName(MiniMessage.miniMessage().deserialize(nameMiniMessage));
            
            meta.lore(loreMiniMessage.stream()
                .map(line -> MiniMessage.miniMessage().deserialize(line))
                .toList()
            );

            // Tag button with unique action identifier
            meta.getPersistentDataContainer().set(ACTION_KEY, PersistentDataType.STRING, actionId);
        });
        return item;
    }
}
```

---

## 4. Assembling the Menu

```java
public void openShopMenu(Player player) {
    CustomMenuHolder holder = new CustomMenuHolder(
        MiniMessage.miniMessage().deserialize("<gradient:#f12711:#f5af19><bold>Server Market</bold></gradient>"),
        3, // 3 rows = 27 slots
        "server_shop"
    );
    Inventory inv = holder.getInventory();

    // Background glass filler
    ItemStack filler = GuiItemBuilder.createButton(
        Material.GRAY_STAINED_GLASS_PANE,
        "<gray> </gray>",
        List.of(),
        "noop" // No operation
    );
    for (int i = 0; i < inv.getSize(); i++) {
        inv.setItem(i, filler);
    }

    // Action button
    inv.setItem(11, GuiItemBuilder.createButton(
        Material.DIAMOND_SWORD,
        "<aqua><bold>Purchase Legendary Blade</bold></aqua>",
        List.of("<gray>Price: <gold>500 Coins</gold></gray>", "<yellow>Click to purchase!</yellow>"),
        "buy_sword"
    ));

    inv.setItem(15, GuiItemBuilder.createButton(
        Material.BARRIER,
        "<red><bold>Close Menu</bold></red>",
        List.of("<gray>Click to exit</gray>"),
        "close_menu"
    ));

    player.openInventory(inv);
}
```

---

## 5. Exploit-Proof Menu Event Listener

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
        // 1. Verify holder instance
        if (!(event.getInventory().getHolder() instanceof CustomMenuHolder holder)) {
            return;
        }

        // 2. ALWAYS cancel to prevent players from moving GUI items!
        event.setCancelled(true);

        // 3. Ignore empty slots or clicks outside the window
        ItemStack clickedItem = event.getCurrentItem();
        if (clickedItem == null || !clickedItem.hasItemMeta()) {
            return;
        }

        if (!(event.getWhoClicked() instanceof Player player)) {
            return;
        }

        // 4. Read action from item PDC
        String action = clickedItem.getItemMeta().getPersistentDataContainer()
            .get(GuiItemBuilder.ACTION_KEY, PersistentDataType.STRING);

        if (action == null || action.equals("noop")) {
            return;
        }

        // 5. Execute action routing
        switch (action) {
            case "buy_sword" -> {
                player.sendMessage(MiniMessage.miniMessage().deserialize("<green>Successfully purchased weapon!</green>"));
                player.closeInventory();
            }
            case "close_menu" -> player.closeInventory();
            default -> player.sendMessage(MiniMessage.miniMessage().deserialize("<red>Unknown menu action.</red>"));
        }
    }
}
```
