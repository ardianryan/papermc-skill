# 12. Modern Data Components & Display Entities (MC 1.20.5 — 26.x)

## 📌 Paradigm Shift: From Legacy NBT & ItemMeta to Data Components

Beginning with **Minecraft 1.20.5** and continuing through **Minecraft 1.21+ and 26.x**, Mojang completely overhauled the item stack architecture.
- **Legacy NBT tags on ItemStacks are gone**.
- In their place is the **Data Component System**: a strictly-typed, immutable, performant, and schema-validated component pipeline.
- Paper exposes this via `io.papermc.paper.datacomponent.DataComponentTypes` and modern item manipulation methods directly on `ItemStack`.

> [!IMPORTANT]
> Never use legacy `net.minecraft.nbt` or reflection to modify item properties in modern Paper plugins. Use `ItemStack#setData(DataComponentType, Object)` or `ItemStack#getData(DataComponentType)`.

---

## 🛠️ 1. Modern Data Components in Action

### A. Modifying Data Components Directly on ItemStack
Paper allows direct mutation of components without cloning `ItemMeta`:

```java
package com.example.paperplugin.item;

import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.CustomModelData;
import io.papermc.paper.datacomponent.item.FoodProperties;
import io.papermc.paper.datacomponent.item.ItemLore;
import io.papermc.paper.datacomponent.item.Tool;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;

import java.util.List;

public final class ModernItemFactory {

    public static ItemStack createMythicBlade() {
        ItemStack blade = ItemStack.of(Material.NETHERITE_SWORD);

        // 1. Direct Item Name (styled with MiniMessage/Adventure)
        blade.setData(DataComponentTypes.ITEM_NAME, Component.text("Voidreaver Blade", NamedTextColor.LIGHT_PURPLE, TextDecoration.BOLD));

        // 2. Direct Item Lore
        blade.setData(DataComponentTypes.LORE, ItemLore.lore(List.of(
            Component.text("Forged in the heart of the End dimension.", NamedTextColor.GRAY),
            Component.empty(),
            Component.text("⚡ Right-click to discharge void kinetic energy.", NamedTextColor.DARK_PURPLE)
        )));

        // 3. Custom Model Data (Modern float/flag/string/int support)
        blade.setData(DataComponentTypes.CUSTOM_MODEL_DATA, CustomModelData.customModelData()
            .addFloat(1.5f)
            .addFlag(true)
            .addString("mythic_blade_tier_3")
            .build()
        );

        // 4. Custom Max Stack Size
        blade.setData(DataComponentTypes.MAX_STACK_SIZE, 1);

        // 5. Enchantment Glint Override (Glow without dummy enchantments!)
        blade.setData(DataComponentTypes.ENCHANTMENT_GLINT_OVERRIDE, true);

        // 6. Unbreakable Flag
        blade.setData(DataComponentTypes.UNBREAKABLE, true);

        return blade;
    }

    public static ItemStack createEnchantedGoldenBerry() {
        ItemStack berry = ItemStack.of(Material.SWEET_BERRIES);

        // Set custom edible Food Properties on ANY item!
        bladeLikeFood(berry);

        return berry;
    }

    private static void bladeLikeFood(ItemStack item) {
        item.setData(DataComponentTypes.FOOD, FoodProperties.food()
            .nutrition(6)
            .saturation(10.0f)
            .canAlwaysEat() // Can eat even when hunger bar is full
            .build()
        );
        item.setData(DataComponentTypes.ITEM_NAME, Component.text("Aetheria Nectar Berry", NamedTextColor.GOLD));
    }
}
```

---

## 🎭 2. Display Entities: Zero-Lag Visual FX & Holograms

In legacy plugins, floating text and custom visuals required invisible `ArmorStand` entities. 
**Armor stands are notoriously laggy**: they tick gravity, collisions, equipment slots, and poses every server tick.

**Display Entities** (`TextDisplay`, `ItemDisplay`, `BlockDisplay`) introduced in modern Minecraft are:
1. **Zero-Tick Lag**: Display entities do not have AI or physics ticking loops.
2. **Smooth Interpolation**: The Minecraft client natively interpolates translation, rotation, and scale at full client framerate (60-240 FPS).
3. **Billboarding**: Automatic camera tracking (`CENTER`, `VERTICAL`, `HORIZONTAL`).

### Smooth Matrix Transformations (`org.joml.Matrix4f`)
Paper integrates the high-performance **JOML** (Java OpenGL Math Library) for 3D transformations.

```java
package com.example.paperplugin.display;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Display;
import org.bukkit.entity.ItemDisplay;
import org.bukkit.entity.TextDisplay;
import org.bukkit.inventory.ItemStack;
import org.bukkit.util.Transformation;
import org.joml.AxisAngle4f;
import org.joml.Vector3f;

public final class HologramManager {

    /**
     * Spawns a floating holographic sign with smooth client-side interpolation.
     */
    public static TextDisplay spawnFloatingTitle(Location loc, Component text) {
        return loc.getWorld().spawn(loc, TextDisplay.class, display -> {
            display.text(text);
            display.setBillboard(Display.Billboard.CENTER); // Always faces player
            display.setDefaultBackground(false);
            display.setBackgroundColor(Color.fromARGB(140, 15, 15, 25));
            display.setShadowed(true);
            display.setSeeThrough(false);

            // Display view distance
            display.setViewRange(0.8f);

            // Initial scale & position transformation
            Transformation transform = new Transformation(
                new Vector3f(0f, 0f, 0f),                      // Translation
                new AxisAngle4f(0f, 0f, 1f, 0f),              // Left rotation
                new Vector3f(1.2f, 1.2f, 1.2f),               // Scale (120%)
                new AxisAngle4f(0f, 0f, 1f, 0f)               // Right rotation
            );
            display.setTransformation(transform);
        });
    }

    /**
     * Spawns a spinning, floating 3D item icon above a pedestal.
     */
    public static ItemDisplay spawnRotatingPedestalItem(Location loc, ItemStack item) {
        return loc.getWorld().spawn(loc, ItemDisplay.class, display -> {
            display.setItemStack(item);
            display.setItemDisplayTransform(ItemDisplay.ItemDisplayTransform.GROUND);
            display.setBillboard(Display.Billboard.FIXED);

            // Set up client-side 20-tick smooth interpolation
            display.setInterpolationDuration(20);
            display.setInterpolationDelay(0);

            // Initial transformation
            Transformation initial = new Transformation(
                new Vector3f(0f, 0.5f, 0f),
                new AxisAngle4f(0f, 0f, 1f, 0f),
                new Vector3f(1.5f, 1.5f, 1.5f),
                new AxisAngle4f(0f, 0f, 1f, 0f)
            );
            display.setTransformation(initial);
        });
    }

    /**
     * Smoothly rotates the display entity over time using client interpolation.
     */
    public static void rotateDisplaySmoothly(Display display, float angleRadians, int durationTicks) {
        display.setInterpolationDuration(durationTicks);
        display.setInterpolationDelay(0);

        Transformation current = display.getTransformation();
        Transformation next = new Transformation(
            current.getTranslation(),
            new AxisAngle4f(angleRadians, 0f, 1f, 0f), // Rotate around Y axis
            current.getScale(),
            current.getRightRotation()
        );

        display.setTransformation(next);
    }
}
```

---

## ⚡ 3. 1.21 Tricky Trials & Mace Combat Kinematics

Minecraft 1.21 introduced the **Mace**, **Wind Charges**, and dynamic physics combat mechanics.

### Mace Kinetic Smash Mechanics
The Mace scales damage dynamically based on fall distance, resetting the attacker's fall distance upon a successful hit:

```java
package com.example.paperplugin.combat;

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

public final class ModernCombatListener implements Listener {

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onMaceSmash(EntityDamageByEntityEvent event) {
        if (!(event.getDamager() instanceof Player attacker)) return;
        if (!(event.getEntity() instanceof LivingEntity victim)) return;

        // Verify weapon
        if (attacker.getInventory().getItemInMainHand().getType() != Material.MACE) return;

        float fallDistance = attacker.getFallDistance();
        if (fallDistance > 1.5f) {
            // Smash attack succeeded!
            double bonusDamage = Math.min(fallDistance * 3.5, 40.0); // Safe numeric cap
            event.setDamage(event.getDamage() + bonusDamage);

            Location hitLoc = victim.getLocation();

            // Spawn modern Tricky Trials visual & acoustic feedback
            hitLoc.getWorld().spawnParticle(Particle.TRIAL_SPAWNER_DETECTION, hitLoc.add(0, 0.5, 0), 25, 0.4, 0.2, 0.4, 0.05);
            hitLoc.getWorld().playSound(hitLoc, Sound.ITEM_MACE_SMASH_GROUND, 1.2f, 1.0f);

            // Produce kinetic radial shockwave knockback on nearby hostile entities
            hitLoc.getWorld().getNearbyLivingEntities(hitLoc, 4.0, e -> !e.equals(attacker) && !e.equals(victim))
                .forEach(nearby -> {
                    Vector impulse = nearby.getLocation().toVector().subtract(hitLoc.toVector()).normalize().multiply(1.2).setY(0.4);
                    nearby.setVelocity(impulse);
                });

            attacker.sendActionBar(Component.text("⚡ KINETIC SMASH: +" + String.format("%.1f", bonusDamage) + " DMG", NamedTextColor.GOLD));
        }
    }
}
```

---

## 🛡️ Best Practices & Gotchas

1. **Never Cast Data Components**: Always check `itemStack.hasData(DataComponentTypes.XXX)` before reading `itemStack.getData(DataComponentTypes.XXX)`.
2. **Clean Display Entity Lifecycles**: When removing holograms, always invoke `display.remove()` and clean up stored entity UUIDs. Never store `TextDisplay` references in static collections.
3. **JOML Thread Safety**: `Matrix4f`, `Vector3f`, and `Transformation` are value objects. Create them locally on demand rather than sharing mutable instances across async threads.
4. **Folia Compatibility**: Always execute `world.spawn(loc, Display.class, ...)` on the Folia region scheduler corresponding to `loc`.
