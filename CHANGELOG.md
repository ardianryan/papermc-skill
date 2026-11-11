# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-11-11

### Added
- **Universal Multi-Agent Installation System (`npx papermc-skill install-skill [options]`)**:
  - Direct installation and rule support for 8 premier AI coding agent platforms:
    - **Google Antigravity / agy** (`~/.gemini/config/skills/paper-plugin-dev` and `.agents/skills/`)
    - **Claude Code** (`~/.claude/skills/` and workspace `CLAUDE.md`)
    - **OpenAI Codex** (`~/.codex/skills/` and workspace `CODEX.md`)
    - **Cursor** (`.cursor/rules/paper-plugin-dev.mdc` and `.cursorrules`)
    - **DeepSeek Harness** (`~/.deepseek/skills/` and workspace `DEEPSEEK.md`)
    - **Paseo** (`~/.paseo/skills/` and workspace `.paseo/rules.md`)
    - **pi.dev** (`~/.pi/skills/` and workspace `.pi/rules.md`)
    - **Windsurf** (workspace `.windsurfrules`)
  - Supports `--all`, `--agent <name>`, `--global`, `--local`, and interactive target selection prompt.
- **Overpowered (OP) Code Generators (`npx papermc-skill generate <recipe> [name]`)**:
  - `component-item`: Scaffolds modern Data-Component item builder (MC 1.20.5 - 26.x).
  - `display-entity`: Scaffolds zero-lag interpolated TextDisplay & ItemDisplay hologram engine.
  - `mace-combat`: Scaffolds 1.21 Tricky Trials Mace smash physics and shockwave knockback.
  - `menu-gui`: Scaffolds exploit-proof inventory menu controller with 200ms click debounce.
- **Masterclass Guide 12: Modern Data Components & Display Entities (`docs/12-data-components-and-display-entities.md`)**:
  - Comprehensive guide on the paradigm shift from legacy NBT to DataComponentTypes (`io.papermc.paper.datacomponent`), Custom Model Data, Food properties, Tool rules, and JOML Matrix4f smooth client-side interpolation.
- **Masterclass Guide 13: Multi-Agent System & Universal AI Tooling (`docs/13-multi-agent-system-and-tooling.md`)**:
  - In-depth architectural setup guide for orchestrating Paper & Folia plugin development across all major AI agent harnesses.
- **Enhanced Security Audit Scanner**:
  - Added detection for legacy NBT manipulation (`net.minecraft.nbt`), `BukkitRunnable` on Folia, and `ArmorStand` laggy floating text anti-patterns.

### Changed
- **PaperMC & Folia Modern Versioning Support**:
  - Updated compatibility matrix to support Paper 1.21+ through 26.x (Java 21 LTS and Java 25+).
  - Enriched `skills/paper-plugin-dev/SKILL.md` with modern Tricky Trials combat kinematics and Data Components recipes.

## [1.1.0] - 2026-10-01

### Added
- **Plugin Security & Anti-Exploit Scanner CLI (`npx papermc-skill audit [path]`)**:
  - Scans Java sources for known Bukkit/Paper vulnerabilities including legacy ChatColor usage, section sign formatting bugs, static collection memory leaks (`Set<Player>`), synchronous chunk freezes (`world.getChunkAt`), insecure SQL string concatenation, and unbounded float/double parsing.
- **Masterclass Guide 11: Security & Exploit Prevention (`docs/11-security-and-exploit-prevention.md`)**:
  - Deep-dive architectural guide covering item dupe glitch elimination, inventory race conditions, PDC cryptographic tamper-proofing, numeric/economy validation (anti-NaN/overflow), asynchronous chunk loading teleportation, HikariCP connection leak prevention, and memory leak elimination.
- **Massively Enriched AI Agent Skill (`skills/paper-plugin-dev/SKILL.md`)**:
  - Added dedicated Security & Exploit-Proofing protocol.
  - Added production recipes for Secure Brigadier Commands with numeric bounds, Safe GUI Menu Controllers with 200ms click debounce and drag cancellation, Anti-Tamper PDC Item Utilities, Universal Folia/Paper Schedulers, and Async HikariCP Database Managers.
  - Added 20-point Pre-Release Security Audit Checklist.

### Changed
- **SchedulerAdapter Precision Hardening**:
  - Fixed tick conversion in `SchedulerAdapter.java` to use exact millisecond calculation `timeUnit.toMillis(delay) / 50L`.
- **Documentation & Distribution**:
  - Added `assets/` to package distribution files for local and offline tooling.
  - Updated README documentation with Guide 11 and audit quickstart command.

## [1.0.1] - 2026-09-15

### Added
- **PaperMC Fill v3 API Dynamic Version Tracker**:
  - New CLI command `npx papermc-skill check-update [--apply]` to query `https://fill.papermc.io/v3/projects/paper` for the newest Minecraft & PaperMC versions, builds, and minimum Java requirements.
  - Automated GitHub Actions workflow (`.github/workflows/paper-updater.yml`) running weekly or on-demand to test and bump Paper versions automatically via Pull Requests.
  - Dependabot configuration (`.github/dependabot.yml`) for automated dependency monitoring across Gradle, GitHub Actions, and npm.
  - Dynamic Version Discovery protocol in AI Agent skill (`skills/paper-plugin-dev/SKILL.md`).
- **Gaming & Hype Aesthetic Overhaul**:
  - Retro ASCII Art header banner, badges, and high-energy developer quotes in `README.md` and GitHub Release notes.

### Changed
- **Dependency Upgrades**:
  - Bumped `io.papermc.paper:paper-api` from `1.21.4` to latest Minecraft 1.21 LTS release `1.21.11-R0.1-SNAPSHOT`.
  - Bumped Gradle Wrapper from `9.4.1` to `9.7.1`.
  - Bumped `xyz.jpenilla.run-paper` from `3.0.2` to `3.1.0`.
  - Bumped `org.jspecify` from `1.0.0` to `1.0.1`.
  - Upgraded GitHub Actions to latest major versions (`actions/checkout@v7`, `actions/setup-java@v6`, `actions/setup-node@v7`, `softprops/action-gh-release@v3`, `peter-evans/create-pull-request@v8`).
- **Build Stabilization**:
  - Added `pluginManagement` with `mavenCentral()` to `settings.gradle.kts` for reliable Gradle plugin dependency resolution.
  - Configured Dependabot ignore rules to keep `paper-api` on Java 21 LTS compatibility.

## [1.0.0] - 2026-09-05

### Added
- **Interactive NPX CLI Tool (`papermc-skill`)**:
  - `npx papermc-skill create [name]`: Interactive project scaffolding for modern Paper & Folia plugins with customizable package name, author, and Minecraft target version.
  - `npx papermc-skill install-skill [--global]`: Automated installation of the `paper-plugin-dev` AI agent skill for workspace (`.agents/skills/`) or global (`~/.gemini/config/skills/`).
  - `npx papermc-skill docs [topic]`: Instant in-terminal viewer for architectural guides.
- **Modern Starter Template (`templates/paper-modern-template`)**:
  - Gradle Kotlin DSL build setup (`build.gradle.kts`) with Java 21 toolchain and Foojay resolver convention.
  - Paper 1.21.4 API dependency and instant testing tasks (`./gradlew runServer`, `./gradlew runFoliaServer`).
  - Bundled official Gradle Wrapper (`gradlew`, `gradlew.bat`).
  - Native Brigadier command registration via `LifecycleEvents.COMMANDS`.
  - Kyori Adventure & MiniMessage integration without deprecated formatting codes.
  - PersistentDataContainer (PDC) usage for player join tracking.
  - Transparent Folia multi-threaded scheduler adapter (`SchedulerAdapter.java`).
- **Comprehensive Architectural & Technical Guides (`docs/`)**:
  - `01-modern-paper-architecture.md`: Paperweight userdev, `paper-plugin.yml`, and `PluginBootstrap`.
  - `02-adventure-and-minimessage.md`: Kyori Adventure Component, gradient tags, Title, Sound, and BossBar.
  - `03-persistent-data-container.md`: PDC on Item, Entity, and Chunk with custom `PersistentDataType`.
  - `04-commands-and-brigadier.md`: Paper native Brigadier commands and Incendo Cloud framework.
  - `05-concurrency-and-folia.md`: Threaded Regions, Folia Schedulers, and thread safety.
  - `06-events-and-listeners.md`: Paper-exclusive events, event priority, and custom events.
  - `07-best-practices-and-perf.md`: Memory leak prevention, async chunk loading, and anti-patterns.
  - `08-gui-and-menus.md`: Safe custom `InventoryHolder` menus with PDC click action buttons.
  - `09-custom-items-and-combat.md`: Raycasting spells, particles, vanilla cooldowns, and combat mechanics.
  - `10-database-and-storage.md`: Asynchronous database handling with SQLite and MySQL HikariCP pool.
- **AI Agent Skill Specification (`skills/paper-plugin-dev/SKILL.md`)**:
  - Step-by-step workflow, dependency matrix, and ready-to-use code recipes for coding assistants.
- **Nine Cloned Open-Source Reference Plugins (`references/`)**:
  - `squaremap`, `chunky`, `luckperms`, `miniplaceholders`, `vault-api`, `run-paper`, `decentholograms`, `bstats`, and `paperweight-test-plugin`.
- **Open-Source Governance & Security Suite**:
  - MIT License (`LICENSE`), Code of Conduct (`CODE_OF_CONDUCT.md`), Contributing Guide (`CONTRIBUTING.md`), and Security Policy (`SECURITY.md`).
  - GitHub Issue and Pull Request templates (`.github/ISSUE_TEMPLATE/`).
  - Automated CI and NPM Publish workflows with provenance (`.github/workflows/`).
