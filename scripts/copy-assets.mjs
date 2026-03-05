#!/usr/bin/env node
/**
 * copy-assets.mjs
 * Copies game assets from the local Blood on the Clocktower folder into
 * the Next.js public directory. Run once after npm install.
 *
 * Usage: node scripts/copy-assets.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Source paths (absolute, relative to the scripts/ directory)
const BOTC_ROOT = path.join(__dirname, '..', '..', 'Blood On The Clocktower');
const ICONS_SRC = path.join(BOTC_ROOT, 'ScriptTool', 'Icons');
const ROLES_SRC = path.join(BOTC_ROOT, 'ScriptTool', 'Roles.json');
const TB_SRC = path.join(BOTC_ROOT, 'Trouble Brewing', 'Trouble Brewing.json');
const SNV_SRC = path.join(BOTC_ROOT, 'Sects And Violets', 'Sects And Violets.json');

// Destination paths
const DATA_DEST = path.join(PROJECT_ROOT, 'public', 'data');
const ICONS_DEST = path.join(PROJECT_ROOT, 'public', 'icons');

// Icon filename overrides: role ID -> icon name (without "BW " prefix and ".png" suffix)
// Used when role.name doesn't match the actual icon filename
const ICON_NAME_OVERRIDES = {
  'mezephele': 'Mezepheles',
};

// Skip if the source BotC folder isn't present (e.g. on CI / Vercel)
// — assets are already committed to the repo in that case.
if (!fs.existsSync(ROLES_SRC)) {
  console.log('copy-assets: source files not found, skipping (assets already in repo).');
  process.exit(0);
}

// Ensure destination directories exist
fs.mkdirSync(DATA_DEST, { recursive: true });
fs.mkdirSync(ICONS_DEST, { recursive: true });

// -------------------------------------------------------------------
// 1. Copy and process Roles.json
// -------------------------------------------------------------------
console.log('Reading Roles.json...');
const rawRoles = JSON.parse(fs.readFileSync(ROLES_SRC, 'utf8'));
fs.writeFileSync(path.join(DATA_DEST, 'roles.json'), JSON.stringify(rawRoles, null, 2));
console.log(`  -> Wrote public/data/roles.json (${rawRoles.length} entries)`);

// -------------------------------------------------------------------
// 2. Copy character icons -> public/icons/{roleId}.png
// -------------------------------------------------------------------
console.log('\nCopying character icons...');
const blankIconSrc = path.join(ICONS_SRC, 'BW .png');
let iconsCopied = 0;
let iconsMissing = 0;

for (const role of rawRoles) {
  // Skip special entries without a team (Dusk, Dawn, Minion_Information, Demon_Information)
  if (!role.team) continue;

  const iconBaseName = ICON_NAME_OVERRIDES[role.id] ?? role.name;
  const src = path.join(ICONS_SRC, `BW ${iconBaseName}.png`);
  const dest = path.join(ICONS_DEST, `${role.id}.png`);

  // Prefer colored 'C {Name}.png' over BW when available
  const coloredSrc = path.join(ICONS_SRC, `C ${iconBaseName}.png`);
  const actualSrc = fs.existsSync(coloredSrc) ? coloredSrc : src;

  if (fs.existsSync(actualSrc)) {
    fs.copyFileSync(actualSrc, dest);
    iconsCopied++;
  } else {
    console.warn(`  WARN: No icon for "${role.id}" (looked for "BW ${iconBaseName}.png")`);
    // Use blank token as fallback
    if (fs.existsSync(blankIconSrc)) {
      fs.copyFileSync(blankIconSrc, dest);
    }
    iconsMissing++;
  }
}
console.log(`  -> Copied ${iconsCopied} icons, ${iconsMissing} missing (used fallback)`);

// -------------------------------------------------------------------
// 3. Copy Trouble Brewing script
// -------------------------------------------------------------------
console.log('\nCopying Trouble Brewing script...');
if (fs.existsSync(TB_SRC)) {
  fs.copyFileSync(TB_SRC, path.join(DATA_DEST, 'tb.json'));
  console.log('  -> Wrote public/data/tb.json');
} else {
  console.error(`  ERROR: TB script not found at: ${TB_SRC}`);
  process.exit(1);
}

// -------------------------------------------------------------------
// 4. Copy Sects & Violets script
// -------------------------------------------------------------------
console.log('\nCopying Sects & Violets script...');
if (fs.existsSync(SNV_SRC)) {
  fs.copyFileSync(SNV_SRC, path.join(DATA_DEST, 'snv.json'));
  console.log('  -> Wrote public/data/snv.json');
} else {
  console.warn(`  WARN: SnV script not found at: ${SNV_SRC}`);
}

// -------------------------------------------------------------------
// 5. Construct Bad Moon Rising script from Roles.json (no official file)
// -------------------------------------------------------------------
console.log('\nConstructing Bad Moon Rising script...');
const bmrMeta = {
  id: '_meta',
  name: 'Bad Moon Rising',
  author: '',
  logo: '',
  colour: '#8B4513',
};
const bmrRoles = rawRoles
  .filter(r => r.edition === 'bmr' && r.team)
  .map(r => ({ id: r.id }));
const bmrScript = [bmrMeta, ...bmrRoles];
fs.writeFileSync(path.join(DATA_DEST, 'bmr.json'), JSON.stringify(bmrScript, null, 2));
console.log(`  -> Wrote public/data/bmr.json (${bmrRoles.length} roles)`);

// -------------------------------------------------------------------
// Done
// -------------------------------------------------------------------
console.log('\nAsset pipeline complete!');
console.log(`  Icons: public/icons/ (${iconsCopied + iconsMissing} files)`);
console.log('  Data:  public/data/ (roles.json, tb.json, snv.json, bmr.json)');
