# Adventure API & MiniMessage di Paper Minecraft

Paper mengintegrasikan **Kyori Adventure** secara native sebagai antarmuka pemrosesan teks. Pendekatan lama yang menggunakan tanda warna section (`§a`, `§l`) atau `org.bukkit.ChatColor` telah **ditinggalkan (deprecated)** karena rentan merusak format teks, tidak mendukung RGB hex secara fleksibel, dan tidak modular.

---

## 1. Mengapa Adventure & MiniMessage?

- **Type-Safe Components**: Teks bukan sekadar string biasa melainkan hierarki objek `Component` yang immutable.
- **Dukungan Warna Penuh**: Mendukung warna 24-bit TrueColor / Hex (`#FF5555`), Gradients, dan Rainbows.
- **Interaktivitas Kaya**: Event klik (`run_command`, `suggest_command`, `open_url`), hover tooltip (`show_text`, `show_item`, `show_entity`), dan font kustom.
- **MiniMessage Format**: String format yang sangat mudah dibaca manusia berbasis tag XML-like, aman dari injeksi formatting.

---

## 2. Format Dasar MiniMessage

Gunakan `net.kyori.adventure.text.minimessage.MiniMessage`:

```java
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;

final MiniMessage mm = MiniMessage.miniMessage();

// Contoh teks berwarna dan bergradasi
Component c1 = mm.deserialize("<gradient:#ff007f:#7f00ff><bold>Server RPG Terhebat</bold></gradient>");
Component c2 = mm.deserialize("<gray>Klik <green><click:run_command:'/spawn'>DI SINI</click></green> untuk kembali ke spawn.</gray>");
Component c3 = mm.deserialize("<hover:show_text:'<yellow>Status: Aktif</yellow>'>Arahkan kursor ke sini</hover>");
```

### Tag MiniMessage Populer:
- Warna bawaan: `<red>`, `<green>`, `<gold>`, `<aqua>`, `<dark_purple>`, `<white>`, dll.
- Warna Hex: `<#rrggbb>` atau `<color:#rrggbb>`.
- Format style: `<bold>` (`<b>`), `<italic>` (`<i>`), `<underlined>` (`<u>`), `<strikethrough>` (`<s>`), `<obfuscated>` (`<obf>`).
- Gradasi warna: `<gradient:#55cdfc:#f7a8b8:#ffffff>Trans Rights</gradient>`.
- Pelangi: `<rainbow>Teks pelangi dinamis</rainbow>`.
- Reset gaya: `<reset>` atau penutupan tag `</red>`.

---

## 3. Dynamic Tag Resolvers (Placeholder Kustom)

MiniMessage menyediakan `TagResolver` untuk memasukkan variabel secara dinamis tanpa merusak parsing atau membuka celah string injection:

```java
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.entity.Player;

public Component createWelcomeMessage(Player player, int coins) {
    return MiniMessage.miniMessage().deserialize(
        "<gold>Selamat datang, <yellow><player_name></yellow>! Koin Anda: <green><coins></green></gold>",
        TagResolver.resolver(
            Placeholder.component("player_name", player.displayName()),
            Placeholder.unparsed("coins", String.valueOf(coins))
        )
    );
}
```

> **Perbedaan `component` vs `unparsed`**:
> - `Placeholder.component(...)`: Menyisipkan child component yang sudah di-parse, mempertahankan format.
> - `Placeholder.unparsed(...)`: Menyisipkan teks murni. Tag apapun di dalamnya **tidak** akan di-evaluasi sebagai tag MiniMessage (aman untuk input dari user/chat chatbox).

---

## 4. Mengirim Pesan ke Audience

Di Paper, setiap entitas yang bisa menerima pesan mengimplementasikan antarmuka `net.kyori.adventure.audience.Audience` (termasuk `Player`, `ConsoleCommandSender`, dan `Server`).

### Chat Biasa & Console Logging
```java
// Mengirim ke pemain
player.sendMessage(MiniMessage.miniMessage().deserialize("<aqua>Pesan masuk!</aqua>"));

// Mengirim via ComponentLogger pada plugin
getComponentLogger().info(MiniMessage.miniMessage().deserialize("<green>Plugin siap melayani pemain!</green>"));
```

### Action Bar
```java
player.sendActionBar(MiniMessage.miniMessage().deserialize("<red>Zona Bahaya!</red>"));
```

### Titles & Subtitles
```java
import net.kyori.adventure.title.Title;
import java.time.Duration;

final Title title = Title.title(
    MiniMessage.miniMessage().deserialize("<gold><bold>KEMENANGAN!</bold></gold>"),
    MiniMessage.miniMessage().deserialize("<gray>Anda memenangkan ronde ini</gray>"),
    Title.Times.times(Duration.ofMillis(500), Duration.ofSeconds(3), Duration.ofMillis(1000))
);

player.showTitle(title);
```

### BossBar
```java
import net.kyori.adventure.bossbar.BossBar;

BossBar bossBar = BossBar.bossBar(
    MiniMessage.miniMessage().deserialize("<dark_red>Ender Dragon HP</dark_red>"),
    0.75f, // 75%
    BossBar.Color.RED,
    BossBar.Overlay.PROGRESS
);

// Tampilkan bossbar
player.showBossBar(bossBar);

// Hapus bila sudah selesai
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

## 5. Serialisasi Item & Lore dengan Adventure

Saat membuat `ItemStack`, gunakan metode komponen `Component` alih-alih String lama:

```java
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import java.util.List;

ItemStack sword = new ItemStack(Material.DIAMOND_SWORD);
ItemMeta meta = sword.getItemMeta();

if (meta != null) {
    // Custom name menggunakan Component
    meta.displayName(MiniMessage.miniMessage().deserialize("<gradient:#00c6ff:#0072ff><bold>Pedang Es Legendaris</bold></gradient>"));
    
    // Lore menggunakan List<Component>
    meta.lore(List.of(
        MiniMessage.miniMessage().deserialize("<gray>Memberikan efek <aqua>Freeze</aqua> saat menyerang.</gray>"),
        MiniMessage.miniMessage().deserialize("<dark_gray>Level: <gold>★★★★★</gold></dark_gray>")
    ));
    
    sword.setItemMeta(meta);
}
```
