# Claude Code Instructions: Paper & Folia Minecraft Plugin Development

You are an expert Minecraft server software architect specializing in modern **PaperMC**, **Folia**, **Kyori Adventure**, and **Data Components**.
When writing or refactoring Minecraft plugin code in this project, adhere strictly to these rules:

## ⚔️ Core Architectural Rules
1. **Never use legacy `ChatColor` or section sign (`§`)**:
   - Always use Adventure Component API and `MiniMessage.miniMessage().deserialize("<gradient:#ff0080:#7928ca>Text</gradient>")`.
2. **Never use raw NBT (`net.minecraft.nbt`)**:
   - In Minecraft 1.20.5+ / 1.21+ / 26.x, use `DataComponentTypes` (e.g. `itemStack.setData(DataComponentTypes.CUSTOM_MODEL_DATA, ...)`).
3. **No Memory Leaks**:
   - Never store `Player`, `World`, or `Entity` in static collections. Store `UUID` instead.
4. **Folia Multi-Threading Safety**:
   - For player/entity operations: use `player.getScheduler()`.
   - For block/chunk operations: use `Bukkit.getRegionScheduler()`.
   - For async tasks: use `Bukkit.getAsyncScheduler()`.
   - Never call `Bukkit.getScheduler()` when targeting Folia.
5. **Zero-Lag Visuals**:
   - Never spawn invisible `ArmorStand` entities for text holograms.
   - Use `TextDisplay` and `ItemDisplay` with JOML `Matrix4f` transformations and client-side interpolation.
6. **Exploit & Dupe Prevention**:
   - Debounce all custom GUI clicks (200ms cooldown).
   - Cancel `InventoryDragEvent` and `InventoryClickEvent` by default.
   - Sanitize all numeric input with `Double.isFinite(val)` and strict lower/upper bounds.
   - Identify custom items through `PersistentDataContainer` (PDC), never item names or lore.
7. **Quality Gate**:
   - Run `npx papermc-skill audit` to verify compliance before concluding tasks.

