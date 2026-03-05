const ADJECTIVES = [
  'ancient', 'broken', 'bright', 'crimson', 'cursed', 'dark', 'fallen',
  'frozen', 'golden', 'haunted', 'hollow', 'hungry', 'ivory', 'lost',
  'pale', 'quiet', 'risen', 'scarlet', 'silent', 'silver', 'sunken',
  'twisted', 'unholy', 'veiled', 'wicked', 'withered', 'arcane', 'blind',
  'bound', 'buried', 'cold', 'dreaming', 'drifting', 'dying', 'empty',
  'fading', 'fearful', 'forsaken', 'forgotten', 'grim', 'hidden',
];

const VERBS = [
  'binding', 'burning', 'calling', 'casting', 'chasing', 'claiming',
  'crossing', 'cursing', 'drifting', 'falling', 'feeding', 'following',
  'gliding', 'guarding', 'haunting', 'hiding', 'hunting', 'keeping',
  'knowing', 'lurking', 'rising', 'roaming', 'seeking', 'sealing',
  'sleeping', 'stalking', 'turning', 'waking', 'walking', 'watching',
  'weeping', 'whispering', 'wandering', 'mourning', 'summoning',
  'bleeding', 'dreaming', 'ending', 'fading', 'fleeing',
];

const NOUNS = [
  'candle', 'chapel', 'coffin', 'compass', 'crown', 'demon', 'dawn',
  'dusk', 'elder', 'exile', 'ghost', 'grave', 'grimoire', 'herald',
  'hollow', 'keeper', 'lantern', 'manor', 'marble', 'pilgrim', 'raven',
  'ritual', 'rune', 'saint', 'seer', 'shadow', 'shroud', 'sigil',
  'specter', 'spirit', 'token', 'tome', 'tower', 'vessel', 'vigil',
  'warden', 'witch', 'witness', 'wraith', 'omen',
];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateWordSlug(): string {
  return `${pick(ADJECTIVES)}-${pick(VERBS)}-${pick(NOUNS)}`;
}
