# Command System Modern: Brigadier & Cloud di Paper

Sistem command di Minecraft Java berevolusi signifikan. Metode lama Bukkit seperti `CommandExecutor`, `TabCompleter`, dan deklarasi perintah di `plugin.yml` kini digantikan oleh:
1. **Paper Native Brigadier API** (diperkenalkan di Paper 1.20.6+ melalui `LifecycleEvents.COMMANDS`).
2. **Incendo Cloud Framework** (`cloud-paper`): Standar industri untuk framework command berbasis anotasi / builder yang sangat fleksibel dan multi-platform.

---

## 1. Native Paper Brigadier Commands (Paper 1.20.6+)

Mojang Brigadier adalah command dispatcher engine resmi Minecraft. Paper mengekspos API Brigadier secara langsung tanpa perlu hack NMS atau dependensi tambahan.

### Registrasi Melalui Lifecycle Events
Command didaftarkan saat fase Bootstrap atau saat event `LifecycleEvents.COMMANDS` dipicu:

```java
package com.example.plugin;

import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import io.papermc.paper.command.brigadier.Commands;
import io.papermc.paper.command.brigadier.CommandSourceStack;
import io.papermc.paper.plugin.bootstrap.BootstrapContext;
import io.papermc.paper.plugin.bootstrap.PluginBootstrap;
import io.papermc.paper.plugin.lifecycle.event.types.LifecycleEvents;
import net.kyori.adventure.text.minimessage.MiniMessage;
import org.bukkit.entity.Player;

public final class CommandBootstrapper implements PluginBootstrap {

    @Override
    public void bootstrap(BootstrapContext context) {
        context.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event -> {
            final Commands commands = event.registrar();

            // Membangun pohon syntax command /teleportzone <nama> [radius]
            commands.register(
                Commands.literal("teleportzone")
                    .requires(source -> source.getSender().hasPermission("plugin.command.teleportzone"))
                    .then(Commands.argument("nama", StringArgumentType.word())
                        .suggests((ctx, builder) -> {
                            builder.suggest("lobby");
                            builder.suggest("arena");
                            builder.suggest("market");
                            return builder.buildFuture();
                        })
                        .then(Commands.argument("radius", IntegerArgumentType.integer(1, 100))
                            .executes(ctx -> {
                                final CommandSourceStack source = ctx.getSource();
                                final String zone = StringArgumentType.getString(ctx, "nama");
                                final int radius = IntegerArgumentType.getInteger(ctx, "radius");

                                source.getSender().sendMessage(
                                    MiniMessage.miniMessage().deserialize(
                                        "<green>Mempersiapkan teleportasi ke zona <gold>" + zone + "</gold> dengan radius <yellow>" + radius + "</yellow>!</green>"
                                    )
                                );
                                return com.mojang.brigadier.Command.SINGLE_SUCCESS;
                            })
                        )
                        .executes(ctx -> {
                            final CommandSourceStack source = ctx.getSource();
                            final String zone = StringArgumentType.getString(ctx, "nama");
                            source.getSender().sendMessage(
                                MiniMessage.miniMessage().deserialize("<green>Teleportasi default ke zona <gold>" + zone + "</gold>!</green>")
                            );
                            return com.mojang.brigadier.Command.SINGLE_SUCCESS;
                        })
                    )
                    .build(),
                "Perintah teleportasi zona modern",
                java.util.List.of("tpzone") // alias
            );
        });
    }
}
```

### Keuntungan Paper Brigadier:
- **Client-Side Syntax Highlighting**: Minecraft client dapat menandai teks merah saat syntax salah sebelum perintah ditekan.
- **Auto Tab-Completion**: Tidak perlu menulis logika `TabCompleter` manual yang rumit.
- **Validasi Tipe Otomatis**: Argument validasi otomatis ditangani (angka out-of-range otomatis ditolak).

---

## 2. Incendo Cloud Command Framework (`cloud-paper`)

Untuk plugin yang membutuhkan dependensi injeksi, parsing objek otomatis (seperti `Player`, `OfflinePlayer`, `World`, `Duration`), dan command yang sangat banyak, **Cloud** adalah pilihan terpopuler.

### Dependensi Gradle:
```kotlin
dependencies {
    implementation("org.incendo:cloud-paper:2.0.0-beta.10")
    // atau cloud-annotations jika menyukai gaya @Command
    implementation("org.incendo:cloud-annotations:2.0.0-beta.10")
}
```

### Inisialisasi Cloud PaperCommandManager:
```java
import org.incendo.cloud.paper.PaperCommandManager;
import org.incendo.cloud.execution.ExecutionCoordinator;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

public class PluginCommands {

    public static PaperCommandManager<CommandSender> createManager(JavaPlugin plugin) {
        PaperCommandManager<CommandSender> manager = PaperCommandManager.createNative(
            plugin,
            ExecutionCoordinator.simpleCoordinator()
        );

        // Daftarkan brigadier mapper jika didukung
        if (manager.hasCapability(org.incendo.cloud.paper.PaperCommandManager.Capability.BRIGADIER)) {
            manager.registerBrigadier();
        }

        return manager;
    }
}
```

### Contoh Perintah dengan Cloud Builder:
```java
import org.incendo.cloud.paper.PaperCommandManager;
import org.incendo.cloud.bukkit.parser.PlayerParser;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import net.kyori.adventure.text.minimessage.MiniMessage;

public void registerGiveRewardCommand(PaperCommandManager<CommandSender> manager) {
    manager.command(
        manager.commandBuilder("reward")
            .permission("plugin.reward")
            .required("target", PlayerParser.playerParser())
            .handler(commandContext -> {
                CommandSender sender = commandContext.sender();
                Player target = commandContext.get("target");

                target.sendMessage(MiniMessage.miniMessage().deserialize("<gold>Kamu menerima hadiah spesial!</gold>"));
                sender.sendMessage(MiniMessage.miniMessage().deserialize("<green>Hadiah terkirim ke " + target.getName() + ".</green>"));
            })
    );
}
```

---

## 3. Komparasi: Kapan Memilih Apa?

| Aspek | Paper Native Brigadier | Incendo Cloud |
| :--- | :--- | :--- |
| **Ukuran Jar** | Zero-dependency (bawaan Paper) | Menambahkan lib ~300KB-800KB (butuh shadow/relocate) |
| **Kemudahan** | Cocok untuk command sederhana-menengah | Sangat baik untuk ratusan sub-command |
| **Argument Parser** | Perlu mapping manual untuk tipe Bukkit | Built-in parser untuk Player, Location, Selector, dll |
| **Portabilitas** | Hanya berjalan di Paper 1.20.6+ | Mendukung Velocity, Bungee, Fabric, Paper |
