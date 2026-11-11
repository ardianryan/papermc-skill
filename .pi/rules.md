# pi.dev Agent Directives: Modern Minecraft Plugin Architecture

- Enforce Kyori Adventure and MiniMessage.
- Never use legacy ChatColor or § color codes.
- Use DataComponentTypes for items (1.20.5+ / 26.x).
- Avoid ArmorStands for holograms; use Display Entities (TextDisplay, ItemDisplay) with smooth client-side interpolation.
- Preserve Folia region-threading safety with RegionScheduler and EntityScheduler.
- Audit security using `npx papermc-skill audit`.
