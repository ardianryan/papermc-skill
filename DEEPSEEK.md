# DeepSeek Harness Directives: Modern Paper & Folia Plugin Development

Follow these production-grade principles when synthesizing or auditing Minecraft Java code:

1. **Kyori Adventure & MiniMessage**:
   - Parse rich color tags using `<green>`, `<gradient:...>`, and `<hover:show_text:...>`.
   - Never output legacy raw format codes `§` or `ChatColor`.
2. **Modern Data Components (MC 1.20.5 — 26.x)**:
   - Use `DataComponentTypes` for all item customization (`FOOD`, `TOOL`, `CUSTOM_MODEL_DATA`, `MAX_STACK_SIZE`).
3. **Thread Safety on Folia**:
   - Entities run on isolated thread pools. Always schedule entity mutations on `entity.getScheduler()`.
   - Never invoke blocking operations (SQL, HTTP, disk) on Bukkit or Folia region threads.
4. **Display Entity Holograms**:
   - Spawn `TextDisplay` or `ItemDisplay` with `Billboard.CENTER` and interpolated transformations.
5. **Exploit Prevention**:
   - Validate numerical arguments with `Double.isFinite()` and bounds.
   - Guard GUIs with a 200ms debounce map.
   - Run `npx papermc-skill audit` on code changes.

