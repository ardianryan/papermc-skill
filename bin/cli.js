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
  gray: '\x1b[90m'
};

function printBanner() {
  console.log(`
${c.cyan}${c.bold}  ____                            __  __  ____ 
 |  _ \\ __ _ _ __   ___ _ __     |  \\/  |/ ___|  ____  _     _ _ _ 
 | |_) / _\` | '_ \\ / _ \\ '__|____| |\\/| | |     / ___|| | __(_) | |
 |  __/ (_| | |_) |  __/ | |_____| |  | | |___  \\___ \\| |/ / | | |
 |_|   \\__,_| .__/ \\___|_|       |_|  |_|\\____| |____/|_|\\_\\_|_|_|
            |_| ${c.reset}${c.dim}Modern Paper & Folia Plugin Toolchain${c.reset}
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
  console.log(`${c.bold}Scaffolding a new Modern Paper Plugin...${c.reset}\n`);

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

async function handleInstallSkill(options) {
  printBanner();
  console.log(`${c.bold}Installing 'paper-plugin-dev' Agent Skill...${c.reset}\n`);

  const isGlobal = options.includes('--global') || options.includes('-g');
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  
  let targetSkillDir;
  if (isGlobal) {
    targetSkillDir = path.join(homeDir, '.gemini', 'config', 'skills', 'paper-plugin-dev');
  } else {
    // Current workspace customization root
    targetSkillDir = path.resolve(process.cwd(), '.agents', 'skills', 'paper-plugin-dev');
  }

  const srcSkillDir = path.join(ROOT_DIR, 'skills', 'paper-plugin-dev');
  if (!fs.existsSync(srcSkillDir)) {
    console.error(`${c.red}Error:${c.reset} Source skill directory not found at ${srcSkillDir}`);
    process.exit(1);
  }

  copyDirRecursive(srcSkillDir, targetSkillDir);

  console.log(`${c.green}${c.bold}✔ Skill successfully installed!${c.reset}`);
  console.log(`  Target: ${c.dim}${targetSkillDir}${c.reset}\n`);
  console.log(`Your AI coding agent can now automatically discover and load the ${c.bold}paper-plugin-dev${c.reset} skill.`);
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
        'User-Agent': 'papermc-skill/1.0.0 (https://github.com/ardianryan/papermc-skill)'
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

    // Candidate group (latest supported group)
    const candidateGroup = versionGroups[0];
    const latestVersions = data.versions[candidateGroup] || [];
    const latestVersionId = latestVersions[0] || candidateGroup;

    // Fetch details for candidate version
    const verRes = await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${latestVersionId}`, {
      headers: {
        'User-Agent': 'papermc-skill/1.0.0 (https://github.com/ardianryan/papermc-skill)'
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

    // Check template version
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

        // Update paper-plugin.yml
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

function printHelp() {
  printBanner();
  console.log(`${c.bold}Usage:${c.reset}
  npx papermc-skill <command> [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}create [name]${c.reset} / ${c.cyan}init [name]${c.reset}   Scaffold a modern Paper & Folia plugin project
  ${c.cyan}check-update [--apply]${c.reset}        Query PaperMC Fill API for new Minecraft & Paper releases
  ${c.cyan}install-skill [--global]${c.reset}     Install the AI skill into workspace (.agents) or global (~/.gemini)
  ${c.cyan}docs [number|keyword]${c.reset}        Browse or print documentation guides
  ${c.cyan}help${c.reset} / ${c.cyan}--help${c.reset}                Display this help screen
  ${c.cyan}--version${c.reset}                    Show version information

${c.bold}Examples:${c.reset}
  ${c.dim}# Create a new Paper plugin in current directory${c.reset}
  npx papermc-skill create MyAwesomePlugin

  ${c.dim}# Check if there is a new Minecraft/Paper update from PaperMC API${c.reset}
  npx papermc-skill check-update

  ${c.dim}# Install AI skill globally for your coding agent${c.reset}
  npx papermc-skill install-skill --global

  ${c.dim}# View the Adventure API and MiniMessage guide${c.reset}
  npx papermc-skill docs adventure
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
    case 'docs':
    case 'doc':
    case 'guide':
      handleDocs(args[1]);
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
