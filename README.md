<div align="center">

```
  ██████╗  █████╗ ██████╗ ███████╗██████╗ ███╗   ███╗ ██████╗ 
  ██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗████╗ ████║██╔════╝ 
  ██████╔╝███████║██████╔╝█████╗  ██████╔╝██╔████╔██║██║      
  ██╔═══╝ ██╔══██║██╔═══╝ ██╔══╝  ██╔══██╗██║╚██╔╝██║██║      
  ██║     ██║  ██║██║     ███████╗██║  ██║██║ ╚═╝ ██║╚██████╗ 
  ╚═╝     ╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝ 
          🎮 THE ULTIMATE PAPER & FOLIA ARSENAL 🎮
```

# ⚔️ PAPERMC PLUGIN SKILL & KNOWLEDGE BASE ⚔️

**Stop writing legacy Spigot code like it's 2014. Build for modern Paper & Folia with pure speed, thread-safety, and zero lag.**

[![PaperMC](https://img.shields.io/badge/PaperMC-1.20.6%20%7C%201.21+-0098FF?style=for-the-badge&logo=minecraft&logoColor=white)](https://papermc.io)
[![Folia](https://img.shields.io/badge/Folia-Multi--Threaded%20Ready-5865F2?style=for-the-badge&logo=dependabot&logoColor=white)](https://github.com/PaperMC/Folia)
[![Java](https://img.shields.io/badge/Java-21%2B%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://adoptium.net)
[![NPM](https://img.shields.io/npm/v/papermc-skill?style=for-the-badge&color=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/papermc-skill)
[![GitHub Release](https://img.shields.io/github/v/release/ardianryan/papermc-skill?style=for-the-badge&color=2ea44f&logo=github&logoColor=white)](https://github.com/ardianryan/papermc-skill/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-44CC11?style=for-the-badge)](LICENSE)

[⚡ Quickstart](#-instant-quickstart-5-seconds) • [💎 Key Features](#-why-modern-paper-matters) • [📚 10 Masterclass Guides](#-10-masterclass-technical-guides) • [🔍 Battle-Tested References](#-cloned-reference-plugins) • [🤖 AI Agent Skill](#-ai-agent-integration)

---

</div>

## 🚀 Instant Quickstart (5 Seconds!)

You don't need to configure Gradle or clone anything manually. Scaffold a production-grade, Folia-ready Paper plugin right now with **one command**:

```bash
npx papermc-skill create MyEpicPlugin
```

Or install the AI skill globally so your coding agents (**Antigravity**, **Cursor**, **Copilot**) write flawless Paper 1.21+ code:

```bash
npx papermc-skill install-skill --global
```

To browse architectural cheat sheets directly in your terminal:
```bash
npx papermc-skill docs
```

To check for the newest Minecraft & PaperMC releases from the official API:
```bash
npx papermc-skill check-update
```

---

## 💎 Why Modern Paper Matters

The Minecraft server ecosystem has evolved dramatically. Legacy habits lead to server lag spikes, thread collisions, and fatal crashes on modern engines:

| Feature | 💀 Legacy Spigot / Bukkit | ⚡ Modern Paper & Folia (1.20.6 / 1.21+) |
| :--- | :--- | :--- |
| **Color & Text** | `ChatColor.RED + "§lText"` | **Kyori Adventure & MiniMessage**: `<gradient:#ff007f:#7f00ff><bold>Text</bold></gradient>` |
| **Persistent Data** | Third-party NBT hacks / Lore reading | **PersistentDataContainer (PDC)**: Native, type-safe NBT on Items, Entities, Chunks, and Worlds. |
| **Command System** | `plugin.yml` + `setExecutor(...)` | **Paper Native Brigadier**: Client-side syntax validation, auto tab-completion directly in Mojang's engine. |
| **Multi-Threading** | Single main thread (`BukkitScheduler`) | **Threaded Regions (Folia)**: Independent regional ticking via `RegionScheduler` & `EntityScheduler`. |
| **Server Internals** | Obfuscated Spigot remapping | **Paperweight Userdev**: Direct, unmapped access to Mojang Mappings (`net.minecraft.*`) at runtime. |

---

## 📚 10 Masterclass Technical Guides

Written by developers for developers, covering everything from basic setup to high-throughput concurrency:

| # | Masterclass Guide | Focus & Highlights |
| :-: | :--- | :--- |
| **01** | [Modern Paper Architecture](https://github.com/ardianryan/papermc-skill/blob/main/docs/01-modern-paper-architecture.md) | `paper-plugin.yml`, `PluginBootstrap` vs `JavaPlugin`, Gradle `paperweight-userdev`, and runtime Mojang mappings. |
| **02** | [Adventure API & MiniMessage](https://github.com/ardianryan/papermc-skill/blob/main/docs/02-adventure-and-minimessage.md) | Hex gradients, dynamic `TagResolver` placeholders, `ComponentLogger`, Titles, BossBars, and Sound playback. |
| **03** | [PersistentDataContainer (PDC)](https://github.com/ardianryan/papermc-skill/blob/main/docs/03-persistent-data-container.md) | Custom NBT on ItemStacks, Entities, and Chunks; implementing custom `PersistentDataType<T, Z>` for Java records. |
| **04** | [Modern Brigadier & Cloud Commands](https://github.com/ardianryan/papermc-skill/blob/main/docs/04-commands-and-brigadier.md) | Native Mojang Brigadier trees via `LifecycleEvents.COMMANDS`, argument suggestions, and Incendo Cloud. |
| **05** | [Concurrency & Folia Compatibility](https://github.com/ardianryan/papermc-skill/blob/main/docs/05-concurrency-and-folia.md) | Threaded regions, region schedulers, entity schedulers, async schedulers, and universal platform wrappers. |
| **06** | [Event System & Paper Listeners](https://github.com/ardianryan/papermc-skill/blob/main/docs/06-events-and-listeners.md) | Paper-exclusive events (`AsyncChatEvent`, `PrePlayerAttackEntityEvent`), event priority, and custom events. |
| **07** | [Best Practices & Performance Tuning](https://github.com/ardianryan/papermc-skill/blob/main/docs/07-best-practices-and-perf.md) | Eliminating GC memory leaks (UUID vs entity references), asynchronous chunk loading (`world.getChunkAtAsync`). |
| **08** | [Modern GUI & Inventory Menus](https://github.com/ardianryan/papermc-skill/blob/main/docs/08-gui-and-menus.md) | Custom `InventoryHolder` menus, PDC interactive buttons, and bulletproof duplication-exploit prevention. |
| **09** | [Custom Items, Abilities & Combat](https://github.com/ardianryan/papermc-skill/blob/main/docs/09-custom-items-and-combat.md) | Raycasting spells (`rayTraceEntities`), particle beam effects, vanilla visual cooldowns, and SFX. |
| **10** | [Asynchronous Database Storage](https://github.com/ardianryan/papermc-skill/blob/main/docs/10-database-and-storage.md) | SQLite & MySQL HikariCP connection pooling, thread-safe asynchronous DAO pattern with `CompletableFuture`. |

---

## 🏛️ Cloned Reference Plugins

Nine battle-tested open-source repositories are included directly in [`references/`](references/) for reverse-engineering and architectural inspiration:

- 🗺️ **[`squaremap`](references/squaremap)**: Production Paperweight, Incendo Cloud commands, and Folia multi-threading by PaperMC core dev `jpenilla`.
- ⚡ **[`chunky`](references/chunky)**: High-throughput async chunk generation engine (`world.getChunkAtAsync`) and multi-platform abstractions.
- 🛡️ **[`luckperms`](references/luckperms)**: Enterprise permissions, HikariCP database pool, caching hierarchy, and custom event bus.
- 🏷️ **[`miniplaceholders`](references/miniplaceholders)**: Advanced Kyori Adventure API and custom MiniMessage tag resolvers.
- 💰 **[`vault-api`](references/vault-api)**: The industry-standard economy and permissions bridge API.
- 🛠️ **[`run-paper`](references/run-paper)**: The instant local Paper/Folia runner Gradle plugin.
- 👻 **[`decentholograms`](references/decentholograms)**: Protocol display entity manipulation, floating text, and packet optimizations.
- 📊 **[`bstats`](references/bstats)**: Global plugin telemetry and metrics integration.
- 🧪 **[`paperweight-test-plugin`](references/paperweight-test-plugin)**: Official PaperMC Mojang mapping testbed.

---

## 🛠️ Runnable Starter Template

A battle-ready project is pre-configured in [`templates/paper-modern-template/`](templates/paper-modern-template):

```bash
# Navigate to the template
cd templates/paper-modern-template

# Launch an automated Paper test server in 60s
./gradlew runServer

# Or launch on multi-threaded Folia
./gradlew runFoliaServer
```

---

## 🤖 AI Agent Integration

This repository includes a machine-readable coding skill in [`skills/paper-plugin-dev/SKILL.md`](skills/paper-plugin-dev/SKILL.md).

When pair-programming with AI coding agents:
- Tell your agent: *"Use the `paper-plugin-dev` skill"*.
- The agent will automatically generate Folia-safe schedulers, MiniMessage components, Brigadier command trees, and PDC data holders with zero legacy anti-patterns.

---

## 📦 Packages & Distribution

| Channel | Identifier / Command | Link |
| :--- | :--- | :--- |
| **NPM Global** | `npx papermc-skill` | [![NPM Version](https://img.shields.io/npm/v/papermc-skill?color=CB3837)](https://www.npmjs.com/package/papermc-skill) |
| **GitHub Packages** | `@ardianryan/papermc-skill` | [GitHub Packages Hub](https://github.com/users/ardianryan/packages?repo_name=papermc-skill) |
| **Release Asset** | `papermc-skill-v1.0.1.zip` | [Latest GitHub Release](https://github.com/ardianryan/papermc-skill/releases/latest) |

---

<div align="center">

### 🌟 Show Your Support!
If this toolkit helped you or your server project, give this repository a **Star ⭐** on GitHub!

*Minecraft is a registered trademark of Mojang Synergies AB. This project is not affiliated with or endorsed by Mojang Synergies AB, Microsoft Corporation, or PaperMC.*

</div>
