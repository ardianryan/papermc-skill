# Custom Items, Ability & Combat di Paper

Membuat item kustom dengan kemampuan sihir atau skill khusus (seperti tongkat sihir petir, pedang lifesteal, atau bow peledak) adalah fitur paling favorit di server RPG dan Mini-games.

Paper menyediakan API native untuk raycasting, particle, cooldown visual vanilla, dan Adventure sound effects tanpa perlu library eksternal.

---

## 1. Anatomi Custom Item dengan PDC

Selalu identifikasi item kustom menggunakan `PersistentDataContainer` (PDC), bukan nama atau lore yang bisa dipalsukan pemain via Anvil:

```java
package com.example.plugin.item;

import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;

import java.util.List;

public final class CustomItemFactory {

    public static final NamespacedKey ITEM_ID_KEY = new NamespacedKey("myplugin", "item_id");
    public static final NamespacedKey COOLDOWN_KEY = new NamespacedKey("myplugin", "ability_cooldown");

    public static ItemStack createLightningWand() {
        ItemStack item = new ItemStack(Material.BLAZE_ROD);
        ItemMeta meta = item.getItemMeta();
        if (meta != null) {
            meta.displayName(MiniMessage.miniMessage().deserialize("<gradient:#ffe259:#ffa751><bold>Tongkat Petir Kuno</bold></gradient>"));
            meta.lore(List.of(
                MiniMessage.miniMessage().deserialize("<gray>Klik kanan untuk menembakkan <yellow>Petir Murni</yellow>.</gray>"),
                MiniMessage.miniMessage().deserialize("<dark_gray>Cooldown: <gold>3 Detik</gold></dark_gray>")
            ));

            // Tandai ID item
            meta.getPersistentDataContainer().set(ITEM_ID_KEY, PersistentDataType.STRING, "lightning_wand");
            item.setItemMeta(meta);
        }
        return item;
    }
}
```

---

## 2. Sistem Cooldown: Visual Vanilla vs Timestamp

Minecraft memiliki API bawaan untuk menampilkan cooldown visual (animasi abu-abu berputar pada hotbar slot):

```java
// Memberikan cooldown visual vanilla selama 60 tick (3 detik) pada Blaze Rod
player.setCooldown(Material.BLAZE_ROD, 60);

// Memeriksa apakah pemain sedang dalam cooldown
if (player.hasCooldown(Material.BLAZE_ROD)) {
    player.sendActionBar(MiniMessage.miniMessage().deserialize("<red>Kemampuan masih cooldown!</red>"));
    return;
}
```

---

## 3. Raycasting Entitas & Partikel (Skill Sihir)

Raycasting digunakan untuk mendeteksi apa yang sedang dibidik pemain secara presisi menggunakan `World#rayTraceEntities` atau kalkulasi vektor:

```java
package com.example.plugin.item;

import net.kyori.adventure.sound.Sound;
import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.FluidCollisionMode;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.SoundCategory;
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

        // 1. Cek Cooldown
        if (player.hasCooldown(Material.BLAZE_ROD)) {
            player.sendActionBar(MiniMessage.miniMessage().deserialize("<red>Tunggu sejenak sebelum menembak lagi!</red>"));
            return;
        }

        // Set cooldown 3 detik (60 ticks)
        player.setCooldown(Material.BLAZE_ROD, 60);

        // 2. Eksekusi Efek Serangan
        castLightningBeam(player);
    }

    private void castLightningBeam(Player player) {
        World world = player.getWorld();
        Location eyeLoc = player.getEyeLocation();
        Vector direction = eyeLoc.getDirection().normalize();

        // Putar suara tembakan sihir
        player.playSound(Sound.sound(
            org.bukkit.Sound.ENTITY_ILLUSIONER_CAST_SPELL.key(),
            Sound.Source.PLAYER,
            1.0f,
            1.5f
        ));

        // Partikel beam sepanjang garis pandang (hingga 30 blok)
        for (double d = 1; d <= 30; d += 0.5) {
            Location point = eyeLoc.clone().add(direction.clone().multiply(d));
            world.spawnParticle(Particle.ELECTRIC_SPARK, point, 2, 0.05, 0.05, 0.05, 0.01);
        }

        // Raytrace entitas yang terkena garis tembakan
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

            // Panggil sambaran petir visual & berikan damage
            world.strikeLightningEffect(hitLoc);
            if (target instanceof Damageable damageable) {
                damageable.damage(8.0, player); // 8 damage = 4 hati
            }

            player.sendActionBar(MiniMessage.miniMessage().deserialize("<yellow>Tembakan Mengenai Target!</yellow>"));
        }
    }
}
```
