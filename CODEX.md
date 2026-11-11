# OpenAI Codex Instructions: Paper & Folia Minecraft Plugin Engineering

This repository uses modern PaperMC (1.21+ / 26.x) and Folia multi-threaded architecture.

## Guidelines for Codex:
- **Build Tool**: Gradle Kotlin DSL (`build.gradle.kts`) with Java 21 LTS or Java 25.
- **Commands**: Modern Brigadier via Paper's `LifecycleEvents.COMMANDS`.
- **Text & UI**: Kyori Adventure with MiniMessage formatting. Legacy `ChatColor` is strictly forbidden.
- **Item System**: Use modern `io.papermc.paper.datacomponent.DataComponentTypes` rather than NBT or reflection.
- **Concurrency**: Respect Folia region thread boundaries. Never mutate blocks or entities off their respective region thread.
- **Display Entities**: Use `TextDisplay` and `ItemDisplay` with JOML `Matrix4f` transformations for holograms.
- **Security**: Prevent item dupes and memory leaks. Audit with `npx papermc-skill audit`.

