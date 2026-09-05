# Contributing to Paper Minecraft Plugin Skill

Thank you for your interest in contributing! This project aims to be the most comprehensive, modern, and production-grade knowledge base and reference ecosystem for Minecraft Java server plugin development using **PaperMC (1.20 - 1.21+)** and **Folia**.

---

## 📋 Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs or Deprecations](#reporting-bugs-or-deprecations)
  - [Suggesting Documentation or Recipes](#suggesting-documentation-or-recipes)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Standards](#development-standards)
  - [Modern Paper API Guidelines](#modern-paper-api-guidelines)
  - [Coding Style](#coding-style)
  - [Commit Conventions](#commit-conventions)
- [Questions & Community](#questions--community)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## How Can I Contribute?

### Reporting Bugs or Deprecations
The Minecraft and Paper ecosystem evolves rapidly. If you find a deprecated method, an outdated Gradle dependency, or a broken code snippet:
1. Search existing GitHub Issues to see if the issue has already been reported.
2. If not, open a new Issue using the **Bug Report** template.
3. Include the target Minecraft/Paper version (e.g., Paper 1.21.4) and the exact error log or behavior observed.

### Suggesting Documentation or Recipes
Have a real-world plugin pattern that would benefit the community or AI models? Open an issue or draft a PR adding a new recipe under `docs/` or updating `skills/paper-plugin-dev/SKILL.md`.

### Submitting Pull Requests
1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-new-recipe
   ```
2. Follow our [Development Standards](#development-standards).
3. If modifying the starter template (`templates/paper-modern-template`), ensure it compiles without warnings:
   ```bash
   cd templates/paper-modern-template
   ./gradlew compileJava
   ```
4. Commit your changes using [Conventional Commits](#commit-conventions).
5. Push to your fork and submit a Pull Request describing your changes and motivation.

---

## Development Standards

### Modern Paper API Guidelines
All contributions must adhere to modern Paper standards:
- **No Legacy Formatting**: Never use `§` or `org.bukkit.ChatColor`. Always use Kyori Adventure `Component` and `MiniMessage`.
- **PersistentDataContainer (PDC)**: Use PDC instead of external NBT libraries or lore parsing. Use `static final NamespacedKey` constants.
- **Folia Compatibility**: Ensure all scheduled code uses region-aware schedulers (`RegionScheduler`, `EntityScheduler`, `AsyncScheduler`) and does not invoke blocking calls on region tick threads.
- **Brigadier Commands**: Modern command examples must use Paper's native Brigadier integration (`LifecycleEvents.COMMANDS`) or type-safe frameworks like Incendo Cloud.
- **Java 21 Requirement**: Code must target Java 21+ bytecode (`options.release = 21`).

### Coding Style
- Write clean, self-documenting code with meaningful variable and method names.
- Prefer immutability and Java records for data containers.
- Use `@NullMarked` or `@NotNull` / `@Nullable` annotations from `org.jspecify.annotations` where appropriate.

### Commit Conventions
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat:` A new feature, guide, or template component.
- `fix:` A bug fix or API correction.
- `docs:` Documentation improvements or additions.
- `refactor:` Code refactoring without behavioral changes.
- `chore:` Maintenance, dependency updates, or configuration adjustments.

*Example*: `docs: add comprehensive guide for asynchronous SQLite and MySQL storage`

---

## Questions & Community

Feel free to open a GitHub Discussion or join the official [PaperMC Discord](https://discord.gg/papermc) for broader Paper API discussions.
