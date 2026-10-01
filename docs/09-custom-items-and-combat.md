# Custom Items, Abilities & Combat in Paper

Crafting custom items with magical abilities and combat mechanics (such as lightning wands, lifesteal swords, or explosive bows) is a hallmark of modern RPG and minigame servers.

Paper provides native APIs for entity raycasting, particle trails, vanilla visual cooldown animations, and Adventure sound effects without external library dependencies.

---

## 1. Anatomy of a Custom Item with PDC

Always identify custom items using `PersistentDataContainer` (PDC) rather than displayName or lore strings which players can forge via an Anvil:

```java
package com.example.plugin.item;

import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;

import java.util.List;

public final class CustomItemFactory {

    public static final NamespacedKey ITEM_ID_KEY = new NamespacedKey("myplugin", "item_id");
    public static final NamespacedKey COOLDOWN_KEY = new NamespacedKey("myplugin", "ability_cooldown");

    public static ItemStack createLightningWand() {
        ItemStack item = new ItemStack(Material.BLAZE_ROD);
        item.editMeta(meta -> {
            meta.displayName(MiniMessage.miniMessage().deserialize("<gradient:#ffe259:#ffa751><bold>Ancient Lightning Wand</bold></gradient>"));
            meta.lore(List.of(
                MiniMessage.miniMessage().deserialize("<gray>Right-click to discharge <yellow>Pure Lightning</yellow>.</gray>"),
                MiniMessage.miniMessage().deserialize("<dark_gray>Cooldown: <gold>3 Seconds</gold></dark_gray>")
            ));

            meta.getPersistentDataContainer().set(ITEM_ID_KEY, PersistentDataType.STRING, "lightning_wand");
        });
        return item;
    }
}
```

---

## 2. Cooldown Management: Visual Vanilla Animations

Minecraft features a native client API to render visual cooldown overlays (the sweeping gray overlay on hotbar slots):

```java
// Apply a 60-tick (3-second) vanilla cooldown to Blaze Rods
player.setCooldown(Material.BLAZE_ROD, 60);

// Query if cooldown is active
if (player.hasCooldown(Material.BLAZE_ROD)) {
    player.sendActionBar(MiniMessage.miniMessage().deserialize("<red>Ability is on cooldown!</red>"));
    return;
}
```

---

## 3. Entity Raycasting & Particle Beams

Raycasting detects target entities along the player's line of sight using `World#rayTraceEntities`:

```java
package com.example.plugin.item;

import net.kyori.adventure.sound.Sound;
import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.World;
import org.bukkit.entity.Damageable;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.util.RayTraceResult;
import org.bukkit.util.Vector;

public final class CustomItemListener implements Listener {

    @EventHandler
    public void onInteract(PlayerInteractEvent event) {
        if (event.getAction() != Action.RIGHT_CLICK_AIR && event.getAction() != Action.RIGHT_CLICK_BLOCK) {
            return;
        }

        ItemStack item = event.getItem();
        if (item == null || !item.hasItemMeta()) return;

        String itemId = item.getItemMeta().getPersistentDataContainer()
            .get(CustomItemFactory.ITEM_ID_KEY, PersistentDataType.STRING);

        if (!"lightning_wand".equals(itemId)) {
            return;
        }

        event.setCancelled(true);
        Player player = event.getPlayer();

        // 1. Check Cooldown
        if (player.hasCooldown(Material.BLAZE_ROD)) {
            player.sendActionBar(MiniMessage.miniMessage().deserialize("<red>Ability cooling down!</red>"));
            return;
        }

        player.setCooldown(Material.BLAZE_ROD, 60);

        // 2. Execute Spell Effect
        castLightningBeam(player);
    }

    private void castLightningBeam(Player player) {
        World world = player.getWorld();
        Location eyeLoc = player.getEyeLocation();
        Vector direction = eyeLoc.getDirection().normalize();

        // Play cast sound
        player.playSound(Sound.sound(
            org.bukkit.Sound.ENTITY_ILLUSIONER_CAST_SPELL.key(),
            Sound.Source.PLAYER,
            1.0f,
            1.5f
        ));

        // Spawn particle line (up to 30 blocks)
        for (double d = 1; d <= 30; d += 0.5) {
            Location point = eyeLoc.clone().add(direction.clone().multiply(d));
            world.spawnParticle(Particle.ELECTRIC_SPARK, point, 2, 0.05, 0.05, 0.05, 0.01);
        }

        // Raytrace entities colliding with beam
        RayTraceResult result = world.rayTraceEntities(
            eyeLoc,
            direction,
            30.0,
            0.5,
            entity -> entity != player && entity instanceof Damageable
        );

        if (result != null && result.getHitEntity() != null) {
            Entity target = result.getHitEntity();
            Location hitLoc = target.getLocation();

            world.strikeLightningEffect(hitLoc);
            if (target instanceof Damageable damageable) {
                damageable.damage(8.0, player); // 8 damage = 4 hearts
            }

            player.sendActionBar(MiniMessage.miniMessage().deserialize("<yellow>Target struck!</yellow>"));
        }
    }
}
```
