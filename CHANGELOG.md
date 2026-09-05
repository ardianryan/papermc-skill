# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
