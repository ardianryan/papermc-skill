# 13. Multi-Agent System & Universal AI Tooling Setup

Modern Minecraft plugin engineering demands high precision, zero memory leaks, thread safety across Folia regions, and exploit-proof business logic.
**PaperMC Skill** is designed to work seamlessly as a universal agentic skill across all premier AI coding platforms:

- 🌌 **Antigravity / agy** (Google Antigravity & AGY CLI)
- 🧠 **Claude Code** (Anthropic)
- ⚡ **OpenAI Codex / Codex CLI**
- 🖱️ **Cursor IDE**
- 🐋 **DeepSeek Harness**
- 🧭 **Paseo**
- 🥧 **pi.dev**
- 🏄 **Windsurf IDE**

---

## 🚀 One-Command Universal Installation

Install the PaperMC development skill into any agent environment using the zero-dependency CLI:

```bash
# Interactive Mode (choose your target agent)
npx papermc-skill install-skill

# Install globally to all supported agent configurations
npx papermc-skill install-skill --all

# Target a specific AI Agent
npx papermc-skill install-skill --agent agy       # Antigravity (~/.gemini/config/skills)
npx papermc-skill install-skill --agent claude    # Claude Code (~/.claude & CLAUDE.md)
npx papermc-skill install-skill --agent codex     # OpenAI Codex (~/.codex & CODEX.md)
npx papermc-skill install-skill --agent cursor    # Cursor (.cursor/rules & .cursorrules)
npx papermc-skill install-skill --agent deepseek  # DeepSeek Harness (~/.deepseek & DEEPSEEK.md)
npx papermc-skill install-skill --agent paseo     # Paseo (~/.paseo & .paseo/rules.md)
npx papermc-skill install-skill --agent pi        # pi.dev (~/.pi & .pi/rules.md)
npx papermc-skill install-skill --agent windsurf  # Windsurf (.windsurfrules)
```

---

## 🤖 Detailed Agent Configuration Guidelines

### 1. Google Antigravity / agy CLI
- **Global Path**: `~/.gemini/config/skills/paper-plugin-dev/`
- **Workspace Path**: `.agents/skills/paper-plugin-dev/`
- **Behavior**: Antigravity automatically indexes `SKILL.md` in its semantic agent registry. When working on any repository with Java, Gradle, or `paper-plugin.yml`, Antigravity activates the skill to enforce Folia threading rules, MiniMessage color parsing, and exploit prevention.

### 2. Claude Code (Anthropic)
- **Local Rule File**: `CLAUDE.md` in workspace root.
- **Global Skill Directory**: `~/.claude/skills/paper-plugin-dev/`
- **Claude Code Invocation**:
  Claude Code reads `CLAUDE.md` upon session startup. The file instructs Claude to:
  1. Ban legacy `ChatColor` and `org.bukkit.scheduler.BukkitRunnable`.
  2. Implement `io.papermc.paper.threadedregions.scheduler.RegionScheduler` on Folia.
  3. Validate all economy / number arguments against NaN and infinite numbers.
  4. Run `npx papermc-skill audit` before concluding PRs or git commits.

### 3. OpenAI Codex
- **Workspace Directive**: `CODEX.md` in workspace root.
- **Global Store**: `~/.codex/skills/paper-plugin-dev/`
- **Codex Instructions**: Codex references the strict recipes in `skills/paper-plugin-dev/SKILL.md` when generating commands with Brigadier or storing persistent data via `PersistentDataContainer`.

### 4. Cursor IDE
- **Rule Specification**: `.cursor/rules/paper-plugin-dev.mdc`
- **Glob Pattern**: `**/*.java`, `**/*.gradle.kts`, `**/paper-plugin.yml`, `**/config.yml`
- **Cursor Integration**: Whenever you edit Java files or gradle configurations in Cursor, Cursor applies the MDC rule to enforce Adventure component building, asynchronous database queries, and debounce-protected GUI handlers.

### 5. DeepSeek Harness
- **Workspace File**: `DEEPSEEK.md`
- **Global Harness**: `~/.deepseek/skills/paper-plugin-dev/`
- **DeepSeek Execution**: DeepSeek models use step-by-step reasoning on concurrency boundaries to ensure no synchronous block or inventory mutation occurs off the Bukkit/Folia main tick thread.

### 6. Paseo & pi.dev
- **Paseo**: `.paseo/rules.md` and `~/.paseo/skills/paper-plugin-dev/`
- **pi.dev**: `.pi/rules.md` and `~/.pi/skills/paper-plugin-dev/`
- Both agents automatically digest the markdown instructions and provide proactive suggestions when scaffolding plugins.

---

## 🛡️ Built-in Security & Quality Gate

No matter which agent you use, ensure the AI executes the automated auditor before shipping code:

```bash
# Audit plugin codebase for vulnerabilities and outdated APIs
npx papermc-skill audit

# Verify PaperMC version compatibility
npx papermc-skill check-update
```

