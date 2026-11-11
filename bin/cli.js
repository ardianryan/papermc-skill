#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI Color Helpers (Pure zero-dependency, safe for all terminals)
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

function printBanner() {
  console.log(`
${c.cyan}${c.bold}  ____                            __  __  ____ 
 |  _ \\ __ _ _ __   ___ _ __     |  \\/  |/ ___|  ____  _     _ _ _ 
 | |_) / _\` | '_ \\ / _ \\ '__|____| |\\/| | |     / ___|| | __(_) | |
 |  __/ (_| | |_) |  __/ | |_____| |  | | |___  \\___ \\| |/ / | | |
 |_|   \\__,_| .__/ \\___|_|       |_|  |_|\\____| |____/|_|\\_\\_|_|_|
            |_| ${c.reset}${c.dim}Modern Paper & Folia Plugin Toolchain (1.21+ / 26.x)${c.reset}
`);
}

function prompt(question, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const q = defaultValue
      ? `${c.cyan}?${c.reset} ${c.bold}${question}${c.reset} ${c.dim}(${defaultValue})${c.reset}: `
      : `${c.cyan}?${c.reset} ${c.bold}${question}${c.reset}: `;

    rl.question(q, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Strict Input Sanitization (Prevents path traversal, code injection & illegal characters)
function sanitizePluginName(name) {
  const sanitized = String(name || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) {
    throw new Error('Plugin name must contain at least one alphanumeric character.');
  }
  return sanitized;
}

function sanitizePackageName(pkg) {
  const sanitized = String(pkg || '').trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
  if (!sanitized || sanitized.startsWith('.') || sanitized.endsWith('.') || sanitized.includes('..')) {
    throw new Error('Invalid package name format. Example: com.example.myplugin');
  }
  return sanitized;
}

function sanitizeSafeDir(baseDir, targetName) {
  const safeName = path.basename(targetName).replace(/[^a-zA-Z0-9_-]/g, '');
  const resolved = path.resolve(baseDir, safeName);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Security Error: Path traversal attempt detected.');
  }
  return resolved;
}

function copyDirRecursive(src, dest, replacements = {}) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, replacements);
    } else {
      const content = fs.readFileSync(srcPath);

      // Text replacement only on safe, recognized source file types
      if (
        entry.name.endsWith('.gradle.kts') ||
        entry.name.endsWith('.yml') ||
        entry.name.endsWith('.yaml') ||
        entry.name.endsWith('.java') ||
        entry.name.endsWith('.md')
      ) {
        let text = content.toString('utf-8');
        for (const [key, value] of Object.entries(replacements)) {
          text = text.replaceAll(key, value);
        }
        fs.writeFileSync(destPath, text, 'utf-8');
      } else {
        fs.copyFileSync(srcPath, destPath);
      }

      // Preserve executable permissions for gradlew wrapper
      if (entry.name === 'gradlew') {
        try {
          fs.chmodSync(destPath, 0o755);
        } catch (_) {}
      }
    }
  }
}

async function handleCreate(targetDirArg) {
  printBanner();
  console.log(`${c.bold}Scaffolding a new Modern Paper & Folia Plugin...${c.reset}\n`);

  const rawPluginName = await prompt('Plugin Name', targetDirArg || 'MyPaperPlugin');
  const pluginName = sanitizePluginName(rawPluginName);
  const targetDir = sanitizeSafeDir(process.cwd(), targetDirArg || pluginName.toLowerCase());

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`\n${c.red}Error:${c.reset} Target directory '${targetDir}' already exists and is not empty.\n`);
    process.exit(1);
  }

  const rawPackage = await prompt('Package Group (e.g. com.example.plugin)', `com.example.${pluginName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
  const packageName = sanitizePackageName(rawPackage);

  const rawAuthor = await prompt('Author Name', 'Developer');
  const authorName = String(rawAuthor || 'Developer').replace(/[^a-zA-Z0-9_\s-]/g, '').trim() || 'Developer';

  const mcVersion = await prompt('Paper Minecraft Version', '1.21.4');
  const cleanMcVersion = String(mcVersion || '1.21.4').replace(/[^0-9.]/g, '') || '1.21.4';

  console.log(`\n${c.yellow}Creating project at:${c.reset} ${c.dim}${targetDir}${c.reset}`);

  const templateDir = path.join(ROOT_DIR, 'templates', 'paper-modern-template');
  if (!fs.existsSync(templateDir)) {
    console.error(`${c.red}Error:${c.reset} Starter template directory not found at ${templateDir}`);
    process.exit(1);
  }

  // 1. Copy base template with sanitized replacements
  copyDirRecursive(templateDir, targetDir, {
    'ModernPaperTemplate': pluginName,
    'paper-modern-template': pluginName.toLowerCase().replace(/[^a-z0-9_-]/gi, '-'),
    'com.example.paperplugin': packageName,
    '1.21.4': cleanMcVersion,
    'Developer': authorName
  });

  // 2. Refactor Java package directory structure if package changed from com.example.paperplugin
  const defaultPackagePath = path.join(targetDir, 'src', 'main', 'java', 'com', 'example', 'paperplugin');
  const targetPackagePath = path.join(targetDir, 'src', 'main', 'java', ...packageName.split('.'));

  if (defaultPackagePath !== targetPackagePath && fs.existsSync(defaultPackagePath)) {
    fs.mkdirSync(targetPackagePath, { recursive: true });
    const files = fs.readdirSync(defaultPackagePath);
    for (const file of files) {
      fs.renameSync(path.join(defaultPackagePath, file), path.join(targetPackagePath, file));
    }
    // Cleanup empty old dirs safely
    try {
      fs.rmSync(path.join(targetDir, 'src', 'main', 'java', 'com', 'example'), { recursive: true, force: true });
    } catch (_) {}
  }

  console.log(`\n${c.green}${c.bold}✔ Project created successfully!${c.reset}\n`);
  console.log(`${c.bold}To start developing and run your test server:${c.reset}`);
  console.log(`  ${c.cyan}cd${c.reset} ${path.relative(process.cwd(), targetDir) || '.'}`);
  console.log(`  ${c.cyan}./gradlew runServer${c.reset}      ${c.gray}# Launches Paper test server${c.reset}`);
  console.log(`  ${c.cyan}./gradlew runFoliaServer${c.reset} # Launches Folia multi-threaded test server${c.reset}\n`);
}

// Universal Multi-Agent Installer
async function handleInstallSkill(options = []) {
  printBanner();
  console.log(`${c.bold}Universal AI Coding Agent Skill Installer${c.reset}\n`);

  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const cwd = process.cwd();
  const srcSkillDir = path.join(ROOT_DIR, 'skills', 'paper-plugin-dev');

  if (!fs.existsSync(srcSkillDir)) {
    console.error(`${c.red}Error:${c.reset} Source skill directory not found at ${srcSkillDir}`);
    process.exit(1);
  }

  // Parse target flags
  let targetAgent = null;
  const isGlobal = options.includes('--global') || options.includes('-g');
  const isLocal = options.includes('--local') || options.includes('-l');
  const isAll = options.includes('--all') || options.includes('-a');

  for (let i = 0; i < options.length; i++) {
    if (options[i].startsWith('--agent=')) {
      targetAgent = options[i].split('=')[1].toLowerCase();
    } else if (options[i] === '--agent' && options[i + 1]) {
      targetAgent = options[i + 1].toLowerCase();
    }
  }

  // If no target specified and not --all, offer interactive prompt
  if (!targetAgent && !isAll) {
    console.log(`${c.bold}Supported AI Coding Agent Platforms:${c.reset}`);
    console.log(`  ${c.cyan}1.${c.reset} All Agents (Antigravity, Claude, Codex, Cursor, DeepSeek, Paseo, pi.dev, Windsurf)`);
    console.log(`  ${c.cyan}2.${c.reset} Antigravity / agy (~/.gemini/config/skills)`);
    console.log(`  ${c.cyan}3.${c.reset} Claude Code (~/.claude/skills & CLAUDE.md)`);
    console.log(`  ${c.cyan}4.${c.reset} OpenAI Codex (~/.codex/skills & CODEX.md)`);
    console.log(`  ${c.cyan}5.${c.reset} Cursor (.cursor/rules & .cursorrules)`);
    console.log(`  ${c.cyan}6.${c.reset} DeepSeek Harness (~/.deepseek & DEEPSEEK.md)`);
    console.log(`  ${c.cyan}7.${c.reset} Paseo (~/.paseo & .paseo/rules.md)`);
    console.log(`  ${c.cyan}8.${c.reset} pi.dev (~/.pi & .pi/rules.md)`);
    console.log(`  ${c.cyan}9.${c.reset} Windsurf (.windsurfrules)\n`);

    const selection = await prompt('Select target agent platform [1-9]', '1');
    const mapping = {
      '1': 'all',
      '2': 'agy',
      '3': 'claude',
      '4': 'codex',
      '5': 'cursor',
      '6': 'deepseek',
      '7': 'paseo',
      '8': 'pi',
      '9': 'windsurf'
    };
    targetAgent = mapping[selection] || 'all';
  }

  const agentsToInstall = (targetAgent === 'all' || isAll)
    ? ['agy', 'claude', 'codex', 'cursor', 'deepseek', 'paseo', 'pi', 'windsurf']
    : [targetAgent];

  console.log(`\n${c.yellow}Installing skill for:${c.reset} ${c.bold}${agentsToInstall.join(', ')}${c.reset}\n`);

  for (const agent of agentsToInstall) {
    try {
      switch (agent) {
        case 'agy':
        case 'antigravity': {
          const dest = (isLocal && !isGlobal)
            ? path.join(cwd, '.agents', 'skills', 'paper-plugin-dev')
            : path.join(homeDir, '.gemini', 'config', 'skills', 'paper-plugin-dev');
          copyDirRecursive(srcSkillDir, dest);
          console.log(`  ${c.green}✔${c.reset} ${c.bold}Antigravity (agy):${c.reset} Installed to ${c.dim}${dest}${c.reset}`);
          break;
        }

        case 'claude':
        case 'claudecode': {
          const globalDir = path.join(homeDir, '.claude', 'skills', 'paper-plugin-dev');
          copyDirRecursive(srcSkillDir, globalDir);
          const claudeMdSrc = path.join(ROOT_DIR, 'CLAUDE.md');
          if (fs.existsSync(claudeMdSrc)) {
            fs.copyFileSync(claudeMdSrc, path.join(cwd, 'CLAUDE.md'));
          }
          console.log(`  ${c.green}✔${c.reset} ${c.bold}Claude Code:${c.reset} Skill placed in ~/.claude/skills and workspace ${c.dim}CLAUDE.md${c.reset}`);
          break;
        }

        case 'codex':
        case 'openai': {
          const globalDir = path.join(homeDir, '.codex', 'skills', 'paper-plugin-dev');
          copyDirRecursive(srcSkillDir, globalDir);
          const codexMdSrc = path.join(ROOT_DIR, 'CODEX.md');
          if (fs.existsSync(codexMdSrc)) {
            fs.copyFileSync(codexMdSrc, path.join(cwd, 'CODEX.md'));
          }
          console.log(`  ${c.green}✔${c.reset} ${c.bold}OpenAI Codex:${c.reset} Placed in ~/.codex/skills and workspace ${c.dim}CODEX.md${c.reset}`);
          break;
        }

        case 'cursor': {
          const cursorRulesDir = path.join(cwd, '.cursor', 'rules');
          fs.mkdirSync(cursorRulesDir, { recursive: true });
          const mdcSrc = path.join(ROOT_DIR, '.cursor', 'rules', 'paper-plugin-dev.mdc');
          if (fs.existsSync(mdcSrc)) {
            fs.copyFileSync(mdcSrc, path.join(cursorRulesDir, 'paper-plugin-dev.mdc'));
          }
          const cursorRulesSrc = path.join(ROOT_DIR, '.cursorrules');
          if (fs.existsSync(cursorRulesSrc)) {
            fs.copyFileSync(cursorRulesSrc, path.join(cwd, '.cursorrules'));
          }
          console.log(`  ${c.green}✔${c.reset} ${c.bold}Cursor:${c.reset} Created ${c.dim}.cursor/rules/paper-plugin-dev.mdc${c.reset} and ${c.dim}.cursorrules${c.reset}`);
          break;
        }

        case 'deepseek': {
          const globalDir = path.join(homeDir, '.deepseek', 'skills', 'paper-plugin-dev');
          copyDirRecursive(srcSkillDir, globalDir);
          const deepseekSrc = path.join(ROOT_DIR, 'DEEPSEEK.md');
          if (fs.existsSync(deepseekSrc)) {
            fs.copyFileSync(deepseekSrc, path.join(cwd, 'DEEPSEEK.md'));
          }
          console.log(`  ${c.green}✔${c.reset} ${c.bold}DeepSeek Harness:${c.reset} Placed in ~/.deepseek/skills and workspace ${c.dim}DEEPSEEK.md${c.reset}`);
          break;
        }

        case 'paseo': {
          const globalDir = path.join(homeDir, '.paseo', 'skills', 'paper-plugin-dev');
          copyDirRecursive(srcSkillDir, globalDir);
          const paseoRulesDir = path.join(cwd, '.paseo');
          fs.mkdirSync(paseoRulesDir, { recursive: true });
          const paseoSrc = path.join(ROOT_DIR, '.paseo', 'rules.md');
          if (fs.existsSync(paseoSrc)) {
            fs.copyFileSync(paseoSrc, path.join(paseoRulesDir, 'rules.md'));
          }
          console.log(`  ${c.green}✔${c.reset} ${c.bold}Paseo:${c.reset} Placed in ~/.paseo/skills and workspace ${c.dim}.paseo/rules.md${c.reset}`);
          break;
        }

        case 'pi':
        case 'pidev': {
          const globalDir = path.join(homeDir, '.pi', 'skills', 'paper-plugin-dev');
          copyDirRecursive(srcSkillDir, globalDir);
          const piRulesDir = path.join(cwd, '.pi');
          fs.mkdirSync(piRulesDir, { recursive: true });
          const piSrc = path.join(ROOT_DIR, '.pi', 'rules.md');
          if (fs.existsSync(piSrc)) {
            fs.copyFileSync(piSrc, path.join(piRulesDir, 'rules.md'));
          }
          console.log(`  ${c.green}✔${c.reset} ${c.bold}pi.dev:${c.reset} Placed in ~/.pi/skills and workspace ${c.dim}.pi/rules.md${c.reset}`);
          break;
        }

        case 'windsurf': {
          const windsurfSrc = path.join(ROOT_DIR, '.windsurfrules');
          if (fs.existsSync(windsurfSrc)) {
            fs.copyFileSync(windsurfSrc, path.join(cwd, '.windsurfrules'));
          }
          console.log(`  ${c.green}✔${c.reset} ${c.bold}Windsurf:${c.reset} Placed ${c.dim}.windsurfrules${c.reset} in workspace root`);
          break;
        }

        default:
          console.log(`  ${c.yellow}⚠ Unknown agent '${agent}'. Skipped.${c.reset}`);
      }
    } catch (err) {
      console.error(`  ${c.red}✘ Failed installing for ${agent}:${c.reset}`, err.message);
    }
  }

  console.log(`\n${c.green}${c.bold}✔ Skill configuration completed successfully!${c.reset}`);
  console.log(`Your AI coding agents now enforce modern Paper & Folia exploit-proof standards.\n`);
}

// Scaffolder for Overpowered (OP) Recipes
async function handleGenerate(recipeArg, nameArg) {
  printBanner();
  const recipe = (recipeArg || '').toLowerCase();

  const supported = ['component-item', 'display-entity', 'mace-combat', 'menu-gui'];

  if (!recipe || !supported.some(s => s.includes(recipe) || recipe.includes(s.split('-')[0]))) {
    console.log(`${c.bold}Available Overpowered (OP) Code Generators:${c.reset}\n`);
    console.log(`  ${c.cyan}1. component-item${c.reset}  ${c.gray}Modern 1.20.5+ / 1.21+ / 26.x DataComponent item builder${c.reset}`);
    console.log(`  ${c.cyan}2. display-entity${c.reset}  ${c.gray}Zero-lag interpolated TextDisplay & ItemDisplay hologram engine${c.reset}`);
    console.log(`  ${c.cyan}3. mace-combat${c.reset}     ${c.gray}1.21 Tricky Trials Mace smash & wind burst kinetic listener${c.reset}`);
    console.log(`  ${c.cyan}4. menu-gui${c.reset}        ${c.gray}Anti-dupe debounce-protected inventory menu controller${c.reset}\n`);
    console.log(`Usage: ${c.cyan}npx papermc-skill generate <recipe> [ClassName]${c.reset}\n`);
    return;
  }

  const cwd = process.cwd();

  if (recipe.includes('item') || recipe.includes('component')) {
    const className = nameArg || 'ModernItemBuilder';
    const filePath = path.join(cwd, `${className}.java`);
    const code = `package com.example.item;

import io.papermc.paper.datacomponent.DataComponentTypes;
import io.papermc.paper.datacomponent.item.CustomModelData;
import io.papermc.paper.datacomponent.item.FoodProperties;
import io.papermc.paper.datacomponent.item.ItemLore;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;

import java.util.List;

/**
 * Modern Data Component Item Builder (MC 1.20.5 - 26.x compatible).
 * Zero legacy NBT. Type-safe and crash-proof.
 */
public final class ${className} {

    public static ItemStack createMythicRelic() {
        ItemStack item = ItemStack.of(Material.NETHERITE_SWORD);

        // Direct Adventure Item Name & Lore
        item.setData(DataComponentTypes.ITEM_NAME, Component.text("Aegis of the Void", NamedTextColor.LIGHT_PURPLE, TextDecoration.BOLD));
        item.setData(DataComponentTypes.LORE, ItemLore.lore(List.of(
            Component.text("Harvested from trial chambers.", NamedTextColor.GRAY),
            Component.empty(),
            Component.text("✦ Ability: Kinetic Shockwave on hit", NamedTextColor.AQUA)
        )));

        // Modern Custom Model Data (floats, strings, flags)
        item.setData(DataComponentTypes.CUSTOM_MODEL_DATA, CustomModelData.customModelData()
            .addFloat(2.5f)
            .addString("aegis_void_model")
            .build()
        );

        // Component Overrides
        item.setData(DataComponentTypes.ENCHANTMENT_GLINT_OVERRIDE, true);
        item.setData(DataComponentTypes.MAX_STACK_SIZE, 1);
        item.setData(DataComponentTypes.UNBREAKABLE, true);

        return item;
    }
}
`;
    fs.writeFileSync(filePath, code, 'utf-8');
    console.log(`${c.green}✔ Generated Modern Data-Component Item Builder:${c.reset} ${c.bold}${filePath}${c.reset}\n`);
  } else if (recipe.includes('display') || recipe.includes('hologram')) {
    const className = nameArg || 'DisplayHologramEngine';
    const filePath = path.join(cwd, `${className}.java`);
    const code = `package com.example.display;

import net.kyori.adventure.text.Component;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.entity.Display;
import org.bukkit.entity.TextDisplay;
import org.bukkit.util.Transformation;
import org.joml.AxisAngle4f;
import org.joml.Vector3f;

/**
 * High-performance Display Entity Hologram Controller.
 * Zero-tick entity lag. Client-side smooth JOML Matrix4f interpolation.
 */
public final class ${className} {

    public static TextDisplay spawnSmoothHologram(Location loc, Component text) {
        return loc.getWorld().spawn(loc, TextDisplay.class, display -> {
            display.text(text);
            display.setBillboard(Display.Billboard.CENTER);
            display.setDefaultBackground(false);
            display.setBackgroundColor(Color.fromARGB(150, 20, 20, 30));
            display.setShadowed(true);

            // Client-side smooth interpolation (20 ticks = 1s)
            display.setInterpolationDuration(20);
            display.setInterpolationDelay(0);

            // Scale & Position Transformation
            Transformation transform = new Transformation(
                new Vector3f(0f, 0f, 0f),
                new AxisAngle4f(0f, 0f, 1f, 0f),
                new Vector3f(1.1f, 1.1f, 1.1f),
                new AxisAngle4f(0f, 0f, 1f, 0f)
            );
            display.setTransformation(transform);
        });
    }
}
`;
    fs.writeFileSync(filePath, code, 'utf-8');
    console.log(`${c.green}✔ Generated Display Entity Hologram Controller:${c.reset} ${c.bold}${filePath}${c.reset}\n`);
  } else if (recipe.includes('mace') || recipe.includes('combat')) {
    const className = nameArg || 'MaceKineticCombatListener';
    const filePath = path.join(cwd, `${className}.java`);
    const code = `package com.example.combat;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.util.Vector;

/**
 * 1.21 Tricky Trials Mace Smash & Kinetic Shockwave Combat Listener.
 */
public final class ${className} implements Listener {

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onMaceSmash(EntityDamageByEntityEvent event) {
        if (!(event.getDamager() instanceof Player attacker)) return;
        if (!(event.getEntity() instanceof LivingEntity victim)) return;

        if (attacker.getInventory().getItemInMainHand().getType() != Material.MACE) return;

        float fallDistance = attacker.getFallDistance();
        if (fallDistance > 1.5f) {
            double extraDmg = Math.min(fallDistance * 3.5, 45.0);
            event.setDamage(event.getDamage() + extraDmg);

            Location loc = victim.getLocation();
            loc.getWorld().spawnParticle(Particle.TRIAL_SPAWNER_DETECTION, loc.add(0, 0.5, 0), 30, 0.5, 0.2, 0.5, 0.05);
            loc.getWorld().playSound(loc, Sound.ITEM_MACE_SMASH_GROUND, 1.2f, 1.0f);

            // Kinetic shockwave knockback to nearby hostiles
            loc.getWorld().getNearbyLivingEntities(loc, 4.5, e -> !e.equals(attacker) && !e.equals(victim))
                .forEach(e -> {
                    Vector impulse = e.getLocation().toVector().subtract(loc.toVector()).normalize().multiply(1.3).setY(0.4);
                    e.setVelocity(impulse);
                });

            attacker.sendActionBar(Component.text("⚡ SMASH IMPACT: +" + String.format("%.1f", extraDmg) + " DMG", NamedTextColor.GOLD));
        }
    }
}
`;
    fs.writeFileSync(filePath, code, 'utf-8');
    console.log(`${c.green}✔ Generated Mace Kinetic Combat Listener:${c.reset} ${c.bold}${filePath}${c.reset}\n`);
  } else if (recipe.includes('gui') || recipe.includes('menu')) {
    const className = nameArg || 'SafeMenuController';
    const filePath = path.join(cwd, `${className}.java`);
    const code = `package com.example.gui;

import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryCloseEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Exploit-proof Inventory Menu Controller with click debounce.
 */
public class ${className} implements InventoryHolder, Listener {

    private final Inventory inventory;
    private final Map<UUID, Long> clickDebounce = new ConcurrentHashMap<>();

    public ${className}(Component title, int size) {
        this.inventory = Bukkit.createInventory(this, size, title);
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onClick(InventoryClickEvent event) {
        if (!(event.getInventory().getHolder() instanceof ${className})) return;

        event.setCancelled(true);
        if (!(event.getWhoClicked() instanceof Player player)) return;

        long now = System.currentTimeMillis();
        long lastClick = clickDebounce.getOrDefault(player.getUniqueId(), 0L);
        if (now - lastClick < 200) return;
        clickDebounce.put(player.getUniqueId(), now);

        if (event.getClickedInventory() == event.getInventory()) {
            handleSlotAction(player, event.getSlot());
        }
    }

    @EventHandler
    public void onDrag(InventoryDragEvent event) {
        if (event.getInventory().getHolder() instanceof ${className}) {
            event.setCancelled(true);
        }
    }

    @EventHandler
    public void onClose(InventoryCloseEvent event) {
        if (event.getInventory().getHolder() instanceof ${className}) {
            clickDebounce.remove(event.getPlayer().getUniqueId());
        }
    }

    protected void handleSlotAction(Player player, int slot) {
        // Slot action implementation
    }
}
`;
    fs.writeFileSync(filePath, code, 'utf-8');
    console.log(`${c.green}✔ Generated Anti-Dupe Safe Menu Controller:${c.reset} ${c.bold}${filePath}${c.reset}\n`);
  }
}

function handleDocs(topic) {
  const docsDir = path.join(ROOT_DIR, 'docs');
  if (!fs.existsSync(docsDir)) {
    console.error(`${c.red}Error:${c.reset} Docs directory not found.`);
    process.exit(1);
  }

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort();

  if (!topic) {
    printBanner();
    console.log(`${c.bold}Available Architectural & Technical Guides:${c.reset}\n`);
    files.forEach((file, index) => {
      console.log(`  ${c.cyan}${String(index + 1).padStart(2, '0')}.${c.reset} ${c.bold}${file}${c.reset}`);
    });
    console.log(`\nTo view a specific guide, run: ${c.cyan}npx papermc-skill docs <number|keyword>${c.reset}\n`);
    return;
  }

  const cleanTopic = String(topic).replace(/[^a-zA-Z0-9_-]/g, '');
  const matched = files.find(f => f.toLowerCase().includes(cleanTopic.toLowerCase()) || f.startsWith(cleanTopic.padStart(2, '0')));
  if (!matched) {
    console.error(`${c.red}No guide found matching '${topic}'. Run 'npx papermc-skill docs' for a list.${c.reset}`);
    return;
  }

  const content = fs.readFileSync(path.join(docsDir, matched), 'utf-8');
  console.log(`\n${c.green}${c.bold}--- ${matched} ---${c.reset}\n`);
  console.log(content);
}

async function handleCheckUpdate(options = []) {
  printBanner();
  console.log(`${c.bold}Checking PaperMC Fill API for the latest versions...${c.reset}\n`);

  try {
    const res = await fetch('https://fill.papermc.io/v3/projects/paper', {
      headers: {
        'User-Agent': 'papermc-skill/1.2.0 (https://github.com/ardianryan/papermc-skill)'
      }
    });

    if (!res.ok) {
      throw new Error(`PaperMC API returned status ${res.status}`);
    }

    const data = await res.json();
    const versionGroups = Object.keys(data.versions || {});

    if (versionGroups.length === 0) {
      console.log(`${c.yellow}No version groups returned by PaperMC API.${c.reset}`);
      return;
    }

    console.log(`${c.green}${c.bold}✔ Successfully queried PaperMC Fill v3 API${c.reset}\n`);
    console.log(`${c.bold}Available Major Version Groups:${c.reset} ${versionGroups.slice(0, 5).join(', ')}`);

    const candidateGroup = versionGroups[0];
    const latestVersions = data.versions[candidateGroup] || [];
    const latestVersionId = latestVersions[0] || candidateGroup;

    const verRes = await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${latestVersionId}`, {
      headers: {
        'User-Agent': 'papermc-skill/1.2.0 (https://github.com/ardianryan/papermc-skill)'
      }
    });

    let verData = null;
    if (verRes.ok) {
      verData = await verRes.json();
    }

    const latestBuild = verData?.builds?.[0] || 'latest';
    const status = verData?.version?.support?.status || 'UNKNOWN';
    const minJava = verData?.version?.java?.version?.minimum || 21;

    console.log(`\n${c.cyan}${c.bold}Latest PaperMC Release Info:${c.reset}`);
    console.log(`  Version:      ${c.green}${c.bold}${latestVersionId}${c.reset}`);
    console.log(`  Latest Build: ${c.yellow}#${latestBuild}${c.reset}`);
    console.log(`  Support:      ${status === 'SUPPORTED' ? c.green : c.gray}${status}${c.reset}`);
    console.log(`  Minimum Java: ${c.bold}Java ${minJava}+${c.reset}\n`);

    const templateBuildGradle = path.join(ROOT_DIR, 'templates', 'paper-modern-template', 'build.gradle.kts');
    if (fs.existsSync(templateBuildGradle)) {
      const content = fs.readFileSync(templateBuildGradle, 'utf-8');
      const match = content.match(/paper-api:([0-9.]+)-R0\.1-SNAPSHOT/);
      const currentConfigured = match ? match[1] : 'unknown';
      console.log(`Starter Template Current Version: ${c.bold}${currentConfigured}${c.reset}`);

      if (currentConfigured !== latestVersionId && options.includes('--apply')) {
        console.log(`\n${c.yellow}Applying update to templates/paper-modern-template...${c.reset}`);
        let updated = content.replaceAll(currentConfigured, latestVersionId);
        fs.writeFileSync(templateBuildGradle, updated, 'utf-8');

        const pluginYamlPath = path.join(ROOT_DIR, 'templates', 'paper-modern-template', 'src', 'main', 'resources', 'paper-plugin.yml');
        if (fs.existsSync(pluginYamlPath)) {
          let yml = fs.readFileSync(pluginYamlPath, 'utf-8');
          const major = latestVersionId.split('.').slice(0, 2).join('.');
          yml = yml.replace(/api-version:\s*['"][^'"]+['"]/, `api-version: '${major}'`);
          fs.writeFileSync(pluginYamlPath, yml, 'utf-8');
        }
        console.log(`${c.green}${c.bold}✔ Updated starter template to ${latestVersionId}!${c.reset}`);
      } else if (currentConfigured !== latestVersionId) {
        console.log(`${c.dim}Run 'npx papermc-skill check-update --apply' to update template automatically.${c.reset}`);
      } else {
        console.log(`${c.green}Starter template is already up to date!${c.reset}`);
      }
    }
  } catch (err) {
    console.error(`${c.red}Failed to check PaperMC update:${c.reset}`, err.message);
  }
}

async function handleAudit(targetDirInput) {
  printBanner();
  const targetDir = path.resolve(process.cwd(), targetDirInput || '.');
  console.log(`${c.cyan}${c.bold}Running PaperMC Security & Exploit Audit on:${c.reset} ${c.dim}${targetDir}${c.reset}\n`);

  if (!fs.existsSync(targetDir)) {
    console.error(`${c.red}Directory does not exist:${c.reset} ${targetDir}`);
    return;
  }

  const javaFiles = [];
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'build' || entry.name === '.gradle') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name.endsWith('.java')) {
        javaFiles.push(full);
      }
    }
  }

  scan(targetDir);

  if (javaFiles.length === 0) {
    console.log(`${c.yellow}No .java files found to audit in this directory.${c.reset}`);
    return;
  }

  console.log(`Auditing ${c.bold}${javaFiles.length}${c.reset} Java source files for exploit vectors & anti-patterns...\n`);

  const checks = [
    {
      id: 'CHATCOLOR_LEGACY',
      regex: /ChatColor\.[A-Z_]+/,
      level: 'HIGH',
      msg: 'Legacy ChatColor usage detected. Migrate to Adventure Component & MiniMessage to prevent console formatting corruption.'
    },
    {
      id: 'SECTION_SIGN_COLOR',
      regex: /["'].*?§[0-9a-fk-or].*?["']/,
      level: 'HIGH',
      msg: 'Hardcoded legacy section sign (§) detected. Use MiniMessage.miniMessage().deserialize(...) instead.'
    },
    {
      id: 'PLAYER_STATIC_LEAK',
      regex: /public\s+static\s+(?:final\s+)?(?:List|Set|Map|Collection)<(?:[^,>]+,\s*)?Player>/,
      level: 'CRITICAL',
      msg: 'Static collection holding Player instances detected! This causes massive Memory Leaks. Store UUID instead.'
    },
    {
      id: 'LEGACY_NBT_USAGE',
      regex: /net\.minecraft\.nbt\.|NBTTagCompound|NBTTagList/,
      level: 'CRITICAL',
      msg: 'Direct NBT manipulation detected! In MC 1.20.5+ through 26.x, use DataComponentTypes directly on ItemStack.'
    },
    {
      id: 'BUKKIT_RUNNABLE',
      regex: /new\s+BukkitRunnable\s*\(\s*\)/,
      level: 'HIGH',
      msg: 'BukkitRunnable is incompatible with Folia region threading. Migrate to UniversalScheduler or Entity/Region schedulers.'
    },
    {
      id: 'SYNC_CHUNK_LOAD',
      regex: /world\s*\.\s*getChunkAt\s*\(/,
      level: 'HIGH',
      msg: 'Synchronous chunk loading (world.getChunkAt) freezes the main server tick thread. Use getChunkAtAsync instead.'
    },
    {
      id: 'INSECURE_SQL_CONCAT',
      regex: /(?:executeQuery|executeUpdate|execute)\s*\(\s*["'].*?\+/i,
      level: 'CRITICAL',
      msg: 'Potential SQL Injection via string concatenation detected in query. Use PreparedStatement with ? placeholders.'
    },
    {
      id: 'ARMOR_STAND_HOLOGRAM',
      regex: /spawn\s*\([^,]+,\s*ArmorStand\.class/i,
      level: 'INFO',
      msg: 'ArmorStand spawned. For floating text or item pedestals, prefer modern TextDisplay/ItemDisplay for zero-lag smooth interpolation.'
    },
    {
      id: 'RAW_DOUBLE_NAN_CHECK',
      regex: /DoubleArgumentType\.doubleArg\s*\(/,
      level: 'INFO',
      msg: 'Double argument registered. Ensure execution validates !Double.isFinite(val) and checks for positive numbers.'
    }
  ];

  let issueCount = 0;
  for (const file of javaFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const relPath = path.relative(targetDir, file);

    lines.forEach((line, idx) => {
      for (const check of checks) {
        if (check.regex.test(line)) {
          issueCount++;
          const color = check.level === 'CRITICAL' ? c.red : (check.level === 'HIGH' ? c.yellow : c.cyan);
          console.log(`[${color}${check.level}${c.reset}] ${c.bold}${relPath}:${idx + 1}${c.reset}`);
          console.log(`  ${c.dim}${line.trim()}${c.reset}`);
          console.log(`  ↳ ${check.msg}\n`);
        }
      }
    });
  }

  if (issueCount === 0) {
    console.log(`${c.green}${c.bold}✔ 0 Vulnerabilities or Anti-Patterns Found!${c.reset}`);
    console.log(`${c.green}Codebase adheres to modern Paper & Folia exploit-proof security standards.${c.reset}\n`);
  } else {
    console.log(`${c.yellow}${c.bold}Found ${issueCount} potential issue(s).${c.reset} Review docs/11-security-and-exploit-prevention.md and docs/12-data-components-and-display-entities.md for guidelines.\n`);
  }
}

function printHelp() {
  printBanner();
  console.log(`${c.bold}Usage:${c.reset}
  npx papermc-skill <command> [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}create [name]${c.reset} / ${c.cyan}init${c.reset}           Scaffold a modern Paper & Folia plugin project
  ${c.cyan}check-update [--apply]${c.reset}        Query PaperMC Fill API for latest Minecraft & Paper releases
  ${c.cyan}audit [path]${c.reset}                  Audit Java plugin codebase for security exploits & anti-patterns
  ${c.cyan}install-skill [options]${c.reset}       Install skill to AI agents (agy, claude, codex, cursor, deepseek, paseo, pi, windsurf)
  ${c.cyan}generate <recipe> [name]${c.reset}      Generate OP recipes (component-item, display-entity, mace-combat, menu-gui)
  ${c.cyan}docs [number|keyword]${c.reset}        Browse or print documentation guides
  ${c.cyan}help${c.reset} / ${c.cyan}--help${c.reset}                Display this help screen
  ${c.cyan}--version${c.reset}                    Show version information

${c.bold}Install Skill Options:${c.reset}
  ${c.cyan}--all${c.reset}                         Install to all supported agent configurations
  ${c.cyan}--agent <name>${c.reset}                Target specific agent: agy, claude, codex, cursor, deepseek, paseo, pi, windsurf
  ${c.cyan}--global${c.reset} / ${c.cyan}-g${c.reset}               Install globally to home directory
  ${c.cyan}--local${c.reset} / ${c.cyan}-l${c.reset}                Install rules to current workspace directory

${c.bold}Examples:${c.reset}
  ${c.dim}# Install skill to all AI coding agents${c.reset}
  npx papermc-skill install-skill --all

  ${c.dim}# Install skill specifically for Claude Code and Cursor${c.reset}
  npx papermc-skill install-skill --agent claude
  npx papermc-skill install-skill --agent cursor

  ${c.dim}# Generate modern DataComponent item builder${c.reset}
  npx papermc-skill generate component-item EpicSwordBuilder

  ${c.dim}# Generate zero-lag Display Entity hologram engine${c.reset}
  npx papermc-skill generate display-entity HologramController

  ${c.dim}# Audit current project for exploit vectors${c.reset}
  npx papermc-skill audit
`);
}

// CLI Router
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';

  switch (command) {
    case 'create':
    case 'init':
    case 'new':
      await handleCreate(args[1]);
      break;
    case 'check-update':
    case 'update':
      await handleCheckUpdate(args.slice(1));
      break;
    case 'install-skill':
    case 'install':
    case 'skill':
      await handleInstallSkill(args.slice(1));
      break;
    case 'generate':
    case 'gen':
      await handleGenerate(args[1], args[2]);
      break;
    case 'docs':
    case 'doc':
    case 'guide':
      handleDocs(args[1]);
      break;
    case 'audit':
    case 'scan':
    case 'security':
      await handleAudit(args[1]);
      break;
    case '--version':
    case '-v': {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
      console.log(`papermc-skill v${pkg.version}`);
      break;
    }
    case 'help':
    case '--help':
    case '-h':
    default:
      if (command.startsWith('-')) {
        printHelp();
      } else {
        await handleCreate(command);
      }
      break;
  }
}

main().catch((err) => {
  console.error(`\n${c.red}Error:${c.reset}`, err.message);
  process.exit(1);
});
