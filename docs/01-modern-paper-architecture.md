# Modern Minecraft Java Plugin Architecture (Paper & Folia)

This guide explores the modern architectural patterns for building Minecraft Java plugins on PaperMC (specifically versions 1.20+ and 1.21+), covering build tooling, manifest configuration, lifecycle bootstrapping, and native Mojang mappings.

---

## 1. Architectural Evolution: Legacy Spigot vs Modern Paper

Historically, plugins were built on the Bukkit/Spigot API using `plugin.yml` and straightforward Maven/Gradle configurations. However, modern Paper has revolutionized plugin architecture:

| Feature | Legacy Spigot | Modern Paper (1.20.6+ / 1.21+) |
| :--- | :--- | :--- |
| **Manifest File** | `plugin.yml` | `paper-plugin.yml` (or hybrid) |
| **Text Handling** | `ChatColor` & legacy formatting (`§a`) | Kyori Adventure & MiniMessage (`Component`) |
| **Lifecycle Hooks** | Only `JavaPlugin.onLoad` & `onEnable` | `PluginBootstrap` + `JavaPlugin` + `LifecycleEvents` |
| **Command Engine** | `getCommand("...").setExecutor(...)` | Paper Native Brigadier (`LifecycleEvents.COMMANDS`) or Cloud |
| **NMS Mappings** | Obfuscated Spigot mappings (`reobf`) | Runtime Mojang Mappings (1.20.5+) via Paperweight |
| **Multi-Threading** | Single main thread (`BukkitScheduler`) | Multi-threaded region ticking (Folia & region schedulers) |

---

## 2. Build Tooling: Gradle & Paperweight Userdev

The modern industry standard for Paper projects is **Gradle (Kotlin DSL - `.gradle.kts`)** using PaperMC's **`paperweight-userdev`** plugin.

### Key Benefits of Paperweight Userdev:
- Direct access to **Mojang Mappings (NMS)** without cumbersome external deobfuscation workflows.
- Starting from Paper 1.20.5+, Paper servers run native Mojang Mappings in production at runtime.
- Seamless integration with `xyz.jpenilla.run-paper` to launch automated Paper/Folia test servers with a single command (`./gradlew runServer`).

### Example `build.gradle.kts`:

```kotlin
plugins {
    `java-library`
    id("io.papermc.paperweight.userdev") version "2.0.0-beta.21"
    id("xyz.jpenilla.run-paper") version "3.1.0" // Task: ./gradlew runServer
    id("com.gradleup.shadow") version "8.3.6"    // Shadow jar for bundled external libraries
}

group = "com.example"
version = "1.0.0-SNAPSHOT"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21)) // Minecraft 1.20.5+ requires Java 21+
}

dependencies {
    paperweight.paperDevBundle("1.21.11-R0.1-SNAPSHOT")
}

tasks {
    compileJava {
        options.release.set(21)
        options.encoding = Charsets.UTF_8.name()
    }
    
    shadowJar {
        archiveClassifier.set("") // Set shaded jar as default artifact output
        // Relocate external packages to prevent classpath collisions:
        // relocate("org.incendo.cloud", "com.example.plugin.libs.cloud")
    }
}
```

---

## 3. Manifest Configuration: `paper-plugin.yml`

Modern Paper introduces the `paper-plugin.yml` manifest located at `src/main/resources/paper-plugin.yml`.

### Advantages of `paper-plugin.yml`:
- Granular dependency management (bootstrapper dependencies vs server runtime dependencies).
- Declarative bootstrapper class definition (`bootstrapper`).
- Explicit multi-threaded Folia compatibility (`folia-supported: true`).

### Example `paper-plugin.yml` Structure:

```yaml
name: ExamplePlugin
version: '${version}'
main: com.example.plugin.ExamplePlugin
bootstrapper: com.example.plugin.ExampleBootstrap
description: Modern Paper Minecraft Plugin
api-version: '1.21'
folia-supported: true
authors:
  - DeveloperName

dependencies:
  bootstrap:
    # Dependencies required during the bootstrap phase
  server:
    Vault:
      load: BEFORE
      required: false
      join-classpath: true
    LuckPerms:
      load: BEFORE
      required: false
```

---

## 4. Modern Lifecycle: `PluginBootstrap` vs `JavaPlugin`

Paper introduces the `io.papermc.paper.plugin.bootstrap.PluginBootstrap` interface.

### Server Lifecycle Sequence:
1. **Plugin Loader Creation**: Classpath resolution and dependency wiring.
2. **Bootstrap Phase (`PluginBootstrap#bootstrap`)**:
   - Executes before worlds are loaded.
   - Used to register **Brigadier Commands**, modify registry configurations, and set up global resources.
3. **Plugin Instantiation**: The `JavaPlugin` instance is created.
4. **`onLoad()`**: Equivalent to the legacy Bukkit phase.
5. **`onEnable()`**: Event listener registration, schedulers, database connection pools, and UI/game logic setup.
6. **`onDisable()`**: Graceful shutdown, database queue flushing, and task cancellation.

### Bootstrapper Implementation Example:

```java
package com.example.plugin;

import io.papermc.paper.plugin.bootstrap.BootstrapContext;
import io.papermc.paper.plugin.bootstrap.PluginBootstrap;
import io.papermc.paper.plugin.lifecycle.event.types.LifecycleEvents;
import org.jspecify.annotations.NullMarked;

@NullMarked
public final class ExampleBootstrap implements PluginBootstrap {

    @Override
    public void bootstrap(final BootstrapContext context) {
        // Register Lifecycle Events such as modern Brigadier command handlers
        context.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event -> {
            final var registrar = event.registrar();
            // Register Brigadier command nodes here
        });
    }
}
```

### Main Plugin Implementation (`JavaPlugin`):

```java
package com.example.plugin;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.plugin.java.JavaPlugin;

public final class ExamplePlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        // Using Paper's modern ComponentLogger
        getComponentLogger().info(
            Component.text("ExamplePlugin successfully enabled!", NamedTextColor.GREEN)
        );
    }

    @Override
    public void onDisable() {
        getComponentLogger().info(
            Component.text("ExamplePlugin safely disabled.", NamedTextColor.RED)
        );
    }
}
```
