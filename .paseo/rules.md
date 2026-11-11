# Paseo Agent Rules: Paper & Folia Development

- Target: PaperMC 1.21+ / 26.x with Folia region threading support.
- Text: Kyori Adventure + MiniMessage only. Legacy ChatColor and '§' are banned.
- Items: Use DataComponentTypes (MC 1.20.5+ through 26.x). Zero raw NBT.
- Holograms: Use TextDisplay / ItemDisplay with interpolated JOML transformations.
- Concurrency: Thread-safe region scheduling. All I/O and DB queries must run asynchronously.
- Security: Enforce click debounce on GUIs, sanitize numeric inputs against NaN, run `npx papermc-skill audit`.

