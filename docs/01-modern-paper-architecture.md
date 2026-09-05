# Arsitektur Modern Plugin Paper Minecraft Java

Dokumen ini membahas arsitektur modern pembuatan plugin untuk server Paper Minecraft Java (khususnya versi 1.20+ dan 1.21+), mencakup build tools, konfigurasi manifest, lifecycle bootstrapping, dan sistem pemetaan (Mojang mappings).

---

## 1. Evolusi Arsitektur: Spigot vs Modern Paper

Secara historis, plugin Minecraft dibuat di atas Bukkit/Spigot API dengan `plugin.yml` dan Maven/Gradle sederhana. Namun, ekosistem Paper modern telah merevolusi cara kerja plugin:

| Fitur | Spigot Legacy | Modern Paper (1.20.6+ / 1.21+) |
| :--- | :--- | :--- |
| **Manifest File** | `plugin.yml` | `paper-plugin.yml` (atau hybrid) |
| **Text Handling** | `ChatColor` & legacy string formatting (`§a`) | Kyori Adventure & MiniMessage (`Component`) |
| **Lifecycle Hook** | Hanya `JavaPlugin.onLoad` & `onEnable` | `PluginBootstrap` + `JavaPlugin` + `LifecycleEvents` |
| **Command System** | `getCommand("...").setExecutor(...)` | Paper Brigadier Native (`LifecycleEvents.COMMANDS`) atau Cloud |
| **Mapping NMS** | Obfuscated Spigot mapping (`reobf`) | Mojang Mappings langsung di runtime (1.20.5+) via Paperweight |
| **Multi-threading** | Single main thread (`BukkitScheduler`) | Multi-thread regionized ready (Folia & Schedulers terpisah) |

---

## 2. Build Tooling: Gradle & Paperweight Userdev

Standard industri modern untuk proyek Paper adalah **Gradle (Kotlin DSL - `.gradle.kts`)** menggunakan plugin **`paperweight-userdev`** dari PaperMC.

### Keunggulan Paperweight Userdev:
- Menyediakan akses ke **Mojang Mappings (NMS)** langsung tanpa alat deobfuscation eksternal yang rumit.
- Sejak Paper 1.20.5+, server Paper menjalankan Mojang Mappings secara native di runtime.
- Terintegrasi dengan plugin `xyz.jpenilla.run-paper` untuk menjalankan test server Paper/Folia langsung dengan satu perintah gradle (`./gradlew runServer`).

### Contoh `build.gradle.kts`:

```kotlin
plugins {
    `java-library`
    id("io.papermc.paperweight.userdev") version "2.0.0-beta.21"
    id("xyz.jpenilla.run-paper") version "3.0.2" // Task ./gradlew runServer
    id("com.gradleup.shadow") version "8.3.6"    // Shadow jar bila menggunakan dependensi eksternal
}

group = "com.example"
version = "1.0.0-SNAPSHOT"

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(21)) // Minecraft 1.20.5+ membutuhkan minimal Java 21
}

dependencies {
    paperweight.paperDevBundle("1.21.4-R0.1-SNAPSHOT")
    
    // Contoh library umum
    // implementation("org.incendo:cloud-paper:2.0.0-beta.10")
}

tasks {
    compileJava {
        options.release.set(21)
        options.encoding = Charsets.UTF_8.name()
    }
    
    shadowJar {
        archiveClassifier.set("") // Menjadikan output shadow jar sebagai artifact utama
        // relocate package eksternal agar tidak bentrok dengan plugin lain
        // relocate("org.incendo.cloud", "com.example.plugin.libs.cloud")
    }
}
```

---

## 3. Konfigurasi `paper-plugin.yml`

Modern Paper menggunakan manifest `paper-plugin.yml` yang terletak di `src/main/resources/paper-plugin.yml`.

### Keuntungan `paper-plugin.yml`:
- Dukungan dependency loading yang jauh lebih fleksibel (bootstrapper dependencies, server dependencies).
- Mendukung deklarasi bootstrapper class (`bootstrapper`).
- Kompatibilitas multi-threaded Folia (`folia-supported: true`).

### Contoh Struktur `paper-plugin.yml`:

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
    # Dependensi yang dibutuhkan pada fase bootstrap
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

## 4. Lifecycle Baru: `PluginBootstrap` vs `JavaPlugin`

Paper memperkenalkan antarmuka `io.papermc.paper.plugin.bootstrap.PluginBootstrap`.

### Urutan Lifecycle Server Paper:
1. **Plugin Loader Creation**: Resolusi classpath dan dependensi.
2. **Bootstrap Phase (`PluginBootstrap#bootstrap`)**:
   - Berjalan sangat awal sebelum world di-load.
   - Digunakan untuk meregistrasi **Brigadier Commands**, modifikasi konfigurasi registry, dan setup resource global.
3. **Plugin Instantiation**: Instance `JavaPlugin` dibuat.
4. **`onLoad()`**: Mirip fase Spigot tradisional.
5. **`onEnable()`**: Registrasi listener event, scheduler, inisialisasi database, dan setup UI/Game logic.
6. **`onDisable()`**: Graceful shutdown, flush queue database, dan pembatalan task.

### Contoh Implementasi Bootstrapper:

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
        // Registrasi Lifecycle Events seperti command handler modern
        context.getLifecycleManager().registerEventHandler(LifecycleEvents.COMMANDS, event -> {
            final var registrar = event.registrar();
            // Registrasi syntax Brigadier di sini
        });
    }
}
```

### Contoh Implementasi Main Plugin (`JavaPlugin`):

```java
package com.example.plugin;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.plugin.java.JavaPlugin;

public final class ExamplePlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        // Menggunakan ComponentLogger modern Paper
        getComponentLogger().info(
            Component.text("ExamplePlugin berhasil diaktifkan!", NamedTextColor.GREEN)
        );
    }

    @Override
    public void onDisable() {
        getComponentLogger().info(
            Component.text("ExamplePlugin dimatikan secara aman.", NamedTextColor.RED)
        );
    }
}
```
