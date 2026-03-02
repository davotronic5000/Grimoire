#!/usr/bin/env node
/**
 * download-wiki-icons.mjs
 * Downloads full-colour character icons from wiki.bloodontheclocktower.com
 * and writes them to public/icons/{roleId}.png, replacing the BW icons.
 *
 * Run after copy-assets.mjs (needs public/data/roles.json to exist):
 *   node scripts/copy-assets.mjs
 *   node scripts/download-wiki-icons.mjs
 *
 * Or via npm/pnpm:
 *   pnpm icons
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const ICONS_DEST = path.join(PROJECT_ROOT, 'public', 'icons');
const ROLES_JSON = path.join(PROJECT_ROOT, 'public', 'data', 'roles.json');

// Hardcoded overrides where automatic normalisation doesn't produce the wiki name.
// Key: role ID   Value: wiki image name (without 'Icon_' prefix, without '.png' suffix, lowercase)
const WIKI_NAME_OVERRIDES = {
  mezephele: 'mezepheles', // wiki has trailing 's'
};

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/** Convert a role name/id to the lowercase alphanumeric-only string the wiki uses. */
function toWikiName(name) {
  return name
    .toLowerCase()
    .replace(/['\u2019\u2018\u201c\u201d]/g, '') // strip curly/straight quotes
    .replace(/-/g, '')                            // strip hyphens (pit-hag → pithag)
    .replace(/[^a-z0-9]/g, '');                  // strip anything else non-alphanumeric
}

/** GET a URL and return a Buffer. Follows a single redirect. */
function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'BotC-Grimoire-IconFetcher/1.0 (personal project)' },
    }, (res) => {
      // Follow redirects (wiki CDN redirects image requests)
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        res.resume();
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

/** GET a URL and parse as JSON. */
async function fetchJson(url) {
  const buf = await fetchBuffer(url);
  return JSON.parse(buf.toString('utf8'));
}

/** Pause for ms milliseconds. */
const sleep = ms => new Promise(r => setTimeout(r, ms));

// -------------------------------------------------------------------
// Step 1 — Build a map: lowercase-wiki-name -> image URL
// -------------------------------------------------------------------
async function buildWikiIconMap() {
  /** @type {Map<string, string>} lowercase wiki name -> direct image URL */
  const map = new Map();
  let continueToken = null;
  let page = 0;

  process.stdout.write('Querying wiki API');

  do {
    const qs = new URLSearchParams({
      action: 'query',
      generator: 'allimages',
      gaiprefix: 'Icon_',
      gailimit: '500',
      prop: 'imageinfo',
      iiprop: 'url',
      format: 'json',
    });
    if (continueToken) qs.set('gaicontinue', continueToken);

    const url = `https://wiki.bloodontheclocktower.com/api.php?${qs}`;
    const data = await fetchJson(url);
    page++;
    process.stdout.write('.');

    const pages = data?.query?.pages ?? {};
    for (const p of Object.values(pages)) {
      const imgUrl = p?.imageinfo?.[0]?.url;
      if (!imgUrl) continue;

      // Extract name from the URL — more reliable than title (URL always uses underscores)
      // e.g. ".../Icon_fortuneteller.png" -> "fortuneteller"
      const filename = imgUrl.split('/').pop() ?? '';
      const m = filename.match(/^Icon_(.+)\.png$/i);
      if (!m) continue;

      // Normalise to lowercase alphanumeric so role-name lookups match
      const key = toWikiName(m[1]);
      map.set(key, imgUrl);
    }

    // Handle both legacy `query-continue` and modern `continue` response shapes
    continueToken =
      data?.continue?.gaicontinue ??
      data?.['query-continue']?.allimages?.gaicontinue ??
      null;

    if (continueToken) await sleep(300); // be polite between pages
  } while (continueToken);

  console.log(` found ${map.size} icons across ${page} API page(s).`);
  return map;
}

// -------------------------------------------------------------------
// Step 2 — Download an icon for each role
// -------------------------------------------------------------------
async function downloadIcons(roles, wikiMap) {
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const dest = path.join(ICONS_DEST, `${role.id}.png`);

    // Work out which wiki name to look up
    const wikiName = WIKI_NAME_OVERRIDES[role.id] ?? toWikiName(role.name);
    const imgUrl = wikiMap.get(wikiName);

    if (!imgUrl) {
      console.log(`  [MISS]  ${role.id.padEnd(24)} (tried "${wikiName}")`);
      skipped++;
      continue;
    }

    try {
      const buf = await fetchBuffer(imgUrl);
      fs.writeFileSync(dest, buf);
      downloaded++;
      // Overwrite progress line
      process.stdout.write(`\r  [${downloaded + skipped + failed}/${roles.length}] ${role.id.padEnd(28)}`);
      // Small delay to avoid hammering the CDN
      await sleep(80);
    } catch (err) {
      console.log(`\n  [FAIL]  ${role.id} — ${err.message}`);
      failed++;
    }
  }

  return { downloaded, skipped, failed };
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
async function main() {
  // Sanity check
  if (!fs.existsSync(ROLES_JSON)) {
    console.error('ERROR: public/data/roles.json not found.');
    console.error('       Run `node scripts/copy-assets.mjs` first.');
    process.exit(1);
  }

  fs.mkdirSync(ICONS_DEST, { recursive: true });

  const allRoles = JSON.parse(fs.readFileSync(ROLES_JSON, 'utf8'));
  // Filter out special entries (Dusk, Dawn, Minion_Information, Demon_Information)
  const gameRoles = allRoles.filter(r => r.team);
  console.log(`Loaded ${gameRoles.length} roles from public/data/roles.json\n`);

  // Build wiki → URL map
  const wikiMap = await buildWikiIconMap();
  console.log();

  // Download
  console.log(`Downloading icons for ${gameRoles.length} roles...`);
  const { downloaded, skipped, failed } = await downloadIcons(gameRoles, wikiMap);

  console.log(`\n\nResult:`);
  console.log(`  Downloaded : ${downloaded}`);
  console.log(`  Not on wiki: ${skipped}  (existing BW icon kept)`);
  console.log(`  Failed     : ${failed}`);
  console.log('\nIcons written to public/icons/');
}

main().catch(err => { console.error('\n' + err.message); process.exit(1); });
