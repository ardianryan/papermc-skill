# Modern Command Systems: Native Brigadier & Cloud in Paper

The Minecraft Java command system has evolved substantially. Legacy Bukkit patterns like `CommandExecutor`, `TabCompleter`, and command declarations in `plugin.yml` have been superseded by:
1. **Paper Native Brigadier API** (introduced in Paper 1.20.6+ via `LifecycleEvents.COMMANDS`).
2. **Incendo Cloud Framework** (`cloud-paper`): The enterprise standard for annotation-driven and builder-based multi-platform command handling.

---

## 1. Native Paper Brigadier Commands (Paper 1.20.6+)

Mojang Brigadier is Minecraft's official command dispatcher and parser engine. Paper exposes native Brigadier bindings directly without requiring NMS hacks or external shading.

### Registering Commands via Lifecycle Events
Commands are registered during the Bootstrap phase or when the `LifecycleEvents.COMMANDS` event triggers:

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

public final class CommandBootstrapper implements PluginBootstrap {

    @Override
    public void bootstrap(BootstrapContext context) {
        context.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event -> {
            final Commands commands = event.registrar();

            // Construct syntax tree: /teleportzone <name> [radius]
            commands.register(
                Commands.literal("teleportzone")
                    .requires(source -> source.getSender().hasPermission("plugin.command.teleportzone"))
                    .then(Commands.argument("name", StringArgumentType.word())
                        .suggests((ctx, builder) -> {
                            builder.suggest("lobby");
                            builder.suggest("arena");
                            builder.suggest("market");
                            return builder.buildFuture();
                        })
                        .then(Commands.argument("radius", IntegerArgumentType.integer(1, 100))
                            .executes(ctx -> {
                                final CommandSourceStack source = ctx.getSource();
                                final String zone = StringArgumentType.getString(ctx, "name");
                                final int radius = IntegerArgumentType.getInteger(ctx, "radius");

                                source.getSender().sendMessage(
                                    MiniMessage.miniMessage().deserialize(
                                        "<green>Preparing teleportation to zone <gold>" + zone + "</gold> with radius <yellow>" + radius + "</yellow>!</green>"
                                    )
                                );
                                return com.mojang.brigadier.Command.SINGLE_SUCCESS;
                            })
                        )
                        .executes(ctx -> {
                            final CommandSourceStack source = ctx.getSource();
                            final String zone = StringArgumentType.getString(ctx, "name");
                            source.getSender().sendMessage(
                                MiniMessage.miniMessage().deserialize("<green>Default teleportation to zone <gold>" + zone + "</gold>!</green>")
                            );
                            return com.mojang.brigadier.Command.SINGLE_SUCCESS;
                        })
                    )
                    .build(),
                "Modern zone teleportation command",
                java.util.List.of("tpzone") // aliases
            );
        });
    }
}
```

### Advantages of Native Paper Brigadier:
- **Client-Side Syntax Highlighting**: Minecraft clients highlight syntax errors in real-time before sending the command packet.
- **Automated Tab-Completion**: Eliminates complex manual `TabCompleter` string matching.
- **Strict Argument Typing**: Automatically validates argument bounds and rejects invalid types.

---

## 2. Incendo Cloud Command Framework (`cloud-paper`)

For large plugin codebases requiring dependency injection, automatic Bukkit argument parsing (`Player`, `OfflinePlayer`, `World`, `Duration`), and hundreds of sub-commands, **Incendo Cloud** is the leading solution.

### Gradle Dependencies:
```kotlin
dependencies {
    implementation("org.incendo:cloud-paper:2.0.0-beta.10")
    implementation("org.incendo:cloud-annotations:2.0.0-beta.10")
}
```

### Initializing Cloud PaperCommandManager:
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

        if (manager.hasCapability(PaperCommandManager.Capability.BRIGADIER)) {
            manager.registerBrigadier();
        }

        return manager;
    }
}
```

### Building Commands with Cloud:
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

                target.sendMessage(MiniMessage.miniMessage().deserialize("<gold>You received a special reward!</gold>"));
                sender.sendMessage(MiniMessage.miniMessage().deserialize("<green>Reward dispatched to " + target.getName() + ".</green>"));
            })
    );
}
```

---

## 3. Comparison: When to Use Which?

| Aspect | Paper Native Brigadier | Incendo Cloud |
| :--- | :--- | :--- |
| **Artifact Overhead** | Zero-dependency (built directly into Paper) | Adds ~300KB-800KB (requires shadowing & relocating) |
| **Complexity Fit** | Best for small-to-medium command suites | Best for complex enterprise command structures |
| **Parsers** | Requires manual mapping for Bukkit types | Built-in parsers for Players, Locations, Selectors, etc. |
| **Portability** | Paper 1.20.6+ exclusive | Cross-platform (Velocity, BungeeCord, Fabric, Paper) |
