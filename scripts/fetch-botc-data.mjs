#!/usr/bin/env node
/**
 * fetch-botc-data.mjs
 * Downloads the latest role data and night order from release.botc.app
 * and writes the processed JSON files to public/data/.
 *
 * Usage: node scripts/fetch-botc-data.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DEST = path.join(__dirname, '..', 'public', 'data');

const ROLES_URL      = 'https://release.botc.app/resources/data/roles.json';
const NIGHTSHEET_URL = 'https://release.botc.app/resources/data/nightsheet.json';

// ── Special entries that don't exist in the upstream roles.json ────────────────
// Kept verbatim from the official Grimoire wording.
const SPECIAL_ENTRIES = [
  {
    id: 'Dusk',
    name: 'Dusk',
    edition: '',
    team: '',
    firstNight: 1,          // always first
    firstNightReminder: 'Check that all eyes are closed. Some Travellers & Fabled act.',
    otherNight: 1,          // always first
    otherNightReminder: 'Check that all eyes are closed. Some Travellers & Fabled act.',
    reminders: [],
    setup: false,
    ability: '',
  },
  {
    id: 'Dawn',
    name: 'Dawn',
    edition: '',
    team: '',
    firstNight: 100,        // sentinel — always last
    firstNightReminder: 'Take a few seconds. All players open their eyes.',
    otherNight: 100,        // sentinel — always last
    otherNightReminder: 'Take a few seconds. All players open their eyes.',
    reminders: [],
    setup: false,
    ability: '',
  },
  // Minion / Demon info positions are derived from the nightsheet below
  {
    id: 'Minion_Information',
    name: 'Minion Information',
    edition: '',
    team: '',
    firstNight: 0,          // filled in from nightsheet
    firstNightReminder:
      'If 7 or more players: wake all Minions. Show the THIS IS THE DEMON card and point to the Demon.',
    otherNight: 0,
    otherNightReminder: '',
    reminders: [],
    setup: false,
    ability: '',
  },
  {
    id: 'Demon_Information',
    name: 'Demon Information',
    edition: '',
    team: '',
    firstNight: 0,          // filled in from nightsheet
    firstNightReminder:
      'If 7 or more players: wake the Demon. Show the THESE ARE YOUR MINIONS card and point to all Minions. ' +
      'Show the THESE CHARACTERS ARE NOT IN PLAY card and show 3 not-in-play good character tokens.',
    otherNight: 0,
    otherNightReminder: '',
    reminders: [],
    setup: false,
    ability: '',
  },
];

// Nightsheet ID → our special entry ID
const NIGHTSHEET_SPECIAL_MAP = {
  dusk:       'Dusk',
  dawn:       'Dawn',
  minioninfo: 'Minion_Information',
  demoninfo:  'Demon_Information',
};

async function fetchJson(url) {
  console.log(`  Fetching ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function buildPosMap(arr) {
  const map = new Map();
  arr.forEach((id, i) => map.set(id.toLowerCase(), i + 1));
  return map;
}

// Strip Grimoire-app placeholder tokens the upstream data uses
function cleanReminder(text) {
  if (!text) return '';
  return text.replace(/:reminder:/g, '').replace(/\s{2,}/g, ' ').trim();
}

(async () => {
  fs.mkdirSync(DATA_DEST, { recursive: true });

  // ── 1. Fetch upstream data ─────────────────────────────────────────
  const [appRoles, nightsheet] = await Promise.all([
    fetchJson(ROLES_URL),
    fetchJson(NIGHTSHEET_URL),
  ]);
  console.log(`  Loaded ${appRoles.length} roles, ${nightsheet.firstNight.length} first-night / ${nightsheet.otherNight.length} other-night entries`);

  // ── 2. Build night-order position maps (1-based, case-insensitive) ─
  const firstNightPos = buildPosMap(nightsheet.firstNight);
  const otherNightPos = buildPosMap(nightsheet.otherNight);

  // Inject Minion/Demon info positions from nightsheet
  const minionPos = firstNightPos.get('minioninfo') ?? 0;
  const demonPos  = firstNightPos.get('demoninfo')  ?? 0;
  const specialMap = Object.fromEntries(SPECIAL_ENTRIES.map(e => [e.id, e]));
  specialMap['Minion_Information'].firstNight = minionPos;
  specialMap['Demon_Information'].firstNight  = demonPos;

  // ── 3. Transform upstream roles into our schema ────────────────────
  const mainRoles   = [];   // townsfolk / outsider / minion / demon / traveler
  const fabledRoles = [];
  const loricRoles  = [];

  for (const r of appRoles) {
    // Normalise team name (British → American spelling)
    const team = r.team === 'traveller' ? 'traveler' : (r.team ?? '');

    const entry = {
      id:                 r.id,
      name:               r.name,
      edition:            r.edition ?? '',
      team,
      firstNight:         firstNightPos.get(r.id.toLowerCase()) ?? 0,
      firstNightReminder: cleanReminder(r.firstNightReminder),
      otherNight:         otherNightPos.get(r.id.toLowerCase()) ?? 0,
      otherNightReminder: cleanReminder(r.otherNightReminder),
      reminders:          r.reminders ?? [],
      setup:              r.setup ?? false,
      ability:            r.ability ?? '',
    };

    // Preserve remindersGlobal when present
    if (r.remindersGlobal?.length) entry.remindersGlobal = r.remindersGlobal;

    if (team === 'fabled') fabledRoles.push(entry);
    else if (team === 'loric')  loricRoles.push(entry);
    else                        mainRoles.push(entry);
  }

  // ── 4. Assemble roles.json (special entries first, then regular) ───
  const rolesJson = [
    ...SPECIAL_ENTRIES.map(e => specialMap[e.id]),
    ...mainRoles,
  ];

  // ── 5. Write roles.json ────────────────────────────────────────────
  fs.writeFileSync(
    path.join(DATA_DEST, 'roles.json'),
    JSON.stringify(rolesJson, null, 2),
  );
  console.log(`\n  ✓ roles.json — ${rolesJson.length} entries (${mainRoles.length} roles + 4 special)`);

  // ── 6. Write fabled.json ───────────────────────────────────────────
  fs.writeFileSync(
    path.join(DATA_DEST, 'fabled.json'),
    JSON.stringify(fabledRoles, null, 2),
  );
  console.log(`  ✓ fabled.json — ${fabledRoles.length} entries`);

  // ── 7. Write loric.json ────────────────────────────────────────────
  fs.writeFileSync(
    path.join(DATA_DEST, 'loric.json'),
    JSON.stringify(loricRoles, null, 2),
  );
  console.log(`  ✓ loric.json — ${loricRoles.length} entries`);

  // ── 8. Regenerate edition script files ────────────────────────────
  const editions = {
    tb:  { name: 'Trouble Brewing',  colour: '#8B0000' },
    snv: { name: 'Sects and Violets', colour: '#4B0082' },
    bmr: { name: 'Bad Moon Rising',   colour: '#8B4513' },
  };

  for (const [editionId, meta] of Object.entries(editions)) {
    const roleIds = mainRoles
      .filter(r => r.edition === editionId)
      .map(r => ({ id: r.id }));
    const script = [
      { id: '_meta', name: meta.name, author: '', logo: '', colour: meta.colour },
      ...roleIds,
    ];
    const filename = `${editionId}.json`;
    fs.writeFileSync(path.join(DATA_DEST, filename), JSON.stringify(script, null, 2));
    console.log(`  ✓ ${filename} — ${roleIds.length} roles`);
  }

  // ── 9. Summary ─────────────────────────────────────────────────────
  const byTeam = {};
  for (const r of mainRoles) byTeam[r.team] = (byTeam[r.team] ?? 0) + 1;
  console.log('\n  Team breakdown:', byTeam);

  const firstNightWakers = rolesJson.filter(r => r.firstNight > 0 && r.firstNight < 100).length;
  const otherNightWakers = rolesJson.filter(r => r.otherNight > 0 && r.otherNight < 100).length;
  console.log(`  First-night wakers: ${firstNightWakers}, Other-night wakers: ${otherNightWakers}`);
  console.log('\nDone. Run download-wiki-icons.mjs to fetch icons for any new roles.');
})();
