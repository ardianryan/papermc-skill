# Adventure API & MiniMessage in Modern Paper

Paper integrates **Kyori Adventure** natively as its primary text interface. Legacy color formatting using section signs (`§a`, `§l`) or `org.bukkit.ChatColor` has been **deprecated** because it corrupts formatting across modern clients, lacks modularity, and cannot express 24-bit TrueColor RGB gradients cleanly.

---

## 1. Why Kyori Adventure & MiniMessage?

- **Type-Safe Components**: Text is represented as an immutable hierarchy of `Component` objects rather than brittle strings.
- **Full TrueColor Support**: Native 24-bit Hex colors (`#FF5555`), dynamic Gradients, and Rainbow transitions.
- **Rich Interactivity**: Click events (`run_command`, `suggest_command`, `open_url`), hover tooltips (`show_text`, `show_item`, `show_entity`), and custom typography fonts.
- **MiniMessage Format**: A human-readable XML-like syntax that prevents formatting injection vulnerabilities.

---

## 2. Basic MiniMessage Usage

Use `net.kyori.adventure.text.minimessage.MiniMessage`:

```java
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;

final MiniMessage mm = MiniMessage.miniMessage();

// Colored and gradient text examples
Component c1 = mm.deserialize("<gradient:#ff007f:#7f00ff><bold>Legendary RPG Server</bold></gradient>");
Component c2 = mm.deserialize("<gray>Click <green><click:run_command:'/spawn'>HERE</click></green> to return to spawn.</gray>");
Component c3 = mm.deserialize("<hover:show_text:'<yellow>Status: Online</yellow>'>Hover over me</hover>");
```

### Popular MiniMessage Tags:
- Named colors: `<red>`, `<green>`, `<gold>`, `<aqua>`, `<dark_purple>`, `<white>`, etc.
- Hex colors: `<#rrggbb>` or `<color:#rrggbb>`.
- Text styling: `<bold>` (`<b>`), `<italic>` (`<i>`), `<underlined>` (`<u>`), `<strikethrough>` (`<s>`), `<obfuscated>` (`<obf>`).
- Gradients: `<gradient:#55cdfc:#f7a8b8:#ffffff>Trans Rights</gradient>`.
- Rainbow: `<rainbow>Dynamic rainbow text</rainbow>`.
- Style resets: `<reset>` or explicit closing tags like `</red>`.

---

## 3. Dynamic Tag Resolvers (Custom Placeholders)

MiniMessage provides `TagResolver` to insert dynamic variables safely without risking formatting injection:

```java
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.entity.Player;

public Component createWelcomeMessage(Player player, int coins) {
    return MiniMessage.miniMessage().deserialize(
        "<gold>Welcome, <yellow><player_name></yellow>! Balance: <green><coins></green></gold>",
        TagResolver.resolver(
            Placeholder.component("player_name", player.displayName()),
            Placeholder.unparsed("coins", String.valueOf(coins))
        )
    );
}
```

> **`component` vs `unparsed`**:
> - `Placeholder.component(...)`: Inserts an already-parsed child component, preserving rich formatting.
> - `Placeholder.unparsed(...)`: Inserts raw literal text. Any formatting tags inside are **not** evaluated as MiniMessage tags (crucial for sanitizing chat input).

---

## 4. Sending Messages to Audiences

In Paper, every message receiver implements the `net.kyori.adventure.audience.Audience` interface (including `Player`, `ConsoleCommandSender`, and `Server`).

### Standard Chat & Console Logging
```java
// Send to player
player.sendMessage(MiniMessage.miniMessage().deserialize("<aqua>Incoming message!</aqua>"));

// Send via ComponentLogger on the plugin instance
getComponentLogger().info(MiniMessage.miniMessage().deserialize("<green>Plugin ready for connections!</green>"));
```

### Action Bar
```java
player.sendActionBar(MiniMessage.miniMessage().deserialize("<red>Hazard Zone!</red>"));
```

### Titles & Subtitles
```java
import net.kyori.adventure.title.Title;
import java.time.Duration;

final Title title = Title.title(
    MiniMessage.miniMessage().deserialize("<gold><bold>VICTORY!</bold></gold>"),
    MiniMessage.miniMessage().deserialize("<gray>You won this match</gray>"),
    Title.Times.times(Duration.ofMillis(500), Duration.ofSeconds(3), Duration.ofMillis(1000))
);

player.showTitle(title);
```

### BossBar
```java
import net.kyori.adventure.bossbar.BossBar;

BossBar bossBar = BossBar.bossBar(
    MiniMessage.miniMessage().deserialize("<dark_red>Ender Dragon Health</dark_red>"),
    0.75f, // 75%
    BossBar.Color.RED,
    BossBar.Overlay.PROGRESS
);

// Display boss bar
player.showBossBar(bossBar);

// Remove when completed
player.hideBossBar(bossBar);
```

### Sound Effects
```java
import net.kyori.adventure.sound.Sound;
import org.bukkit.SoundCategory;

Sound sound = Sound.sound(
    org.bukkit.Sound.ENTITY_PLAYER_LEVELUP.key(),
    Sound.Source.PLAYER,
    1.0f, // volume
    1.2f  // pitch
);

player.playSound(sound);
```

---

## 5. Item Serialization & Lore with Adventure

When constructing `ItemStack` instances, use `Component` methods instead of legacy raw strings:

```java
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import java.util.List;

ItemStack sword = new ItemStack(Material.DIAMOND_SWORD);
sword.editMeta(meta -> {
    // Custom name using Component
    meta.displayName(MiniMessage.miniMessage().deserialize("<gradient:#00c6ff:#0072ff><bold>Frostmourne Blade</bold></gradient>"));
    
    // Lore using List<Component>
    meta.lore(List.of(
        MiniMessage.miniMessage().deserialize("<gray>Applies <aqua>Freeze</aqua> on hit.</gray>"),
        MiniMessage.miniMessage().deserialize("<dark_gray>Tier: <gold>★★★★★</gold></dark_gray>")
    ));
});
```
