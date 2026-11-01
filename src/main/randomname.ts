import { randomInt } from 'node:crypto';

/**
 * Nicknames of the kind people really use on Steam: two joined words (SilentFox), a word with a number (Frost07),
 * a lower-case handle (storm_lynx), a single nice-sounding word (Aurora, solstice, Willow7), a short word with a twist (Vexx, Fr0st). No real names, no spaces.
 */
const ADJECTIVES = ['Silent', 'Swift', 'Lucky', 'Rusty', 'Frozen', 'Hidden', 'Misty', 'Golden', 'Silver', 'Crimson', 'Cosmic', 'Lazy', 'Brave', 'Calm', 'Wild', 'Mellow', 'Sunny', 'Dusty', 'Gentle', 'Clever', 'Happy', 'Shy', 'Bright', 'Stormy', 'Velvet', 'Amber', 'Cobalt', 'Mossy', 'Nimble', 'Proud', 'Tiny', 'Wandering', 'Winter', 'Midnight', 'Copper', 'Ivory', 'Jolly', 'Salty', 'Sleepy', 'Moody', 'Cozy', 'Chill', 'Neon', 'Cyber', 'Atomic', 'Electric', 'Lunar', 'Solar', 'Wicked', 'Rapid', 'Quiet', 'Savage', 'Lone', 'Dark', 'Pale', 'Burnt', 'Crisp', 'Fuzzy', 'Grumpy'];
const NOUNS = ['Fox', 'Wolf', 'Raven', 'Tiger', 'Hawk', 'Falcon', 'Lynx', 'Cobra', 'Viper', 'Otter', 'Panda', 'Badger', 'Heron', 'Owl', 'Koala', 'Shark', 'Bear', 'Moth', 'Gecko', 'Mantis', 'Hornet', 'Bison',
	'Frost', 'Nova', 'Blaze', 'Echo', 'Ember', 'Comet', 'Orbit', 'Storm', 'Drift', 'Spark', 'Onyx', 'Atlas', 'Ghost', 'Shadow', 'Phantom', 'Titan', 'Jester', 'Bandit', 'Smoke', 'Rush', 'Flash', 'Pixel', 'Turbo', 'Rogue', 'Vex', 'Kilo', 'Rex', 'Zenith', 'Vortex', 'Cipher', 'Glitch', 'Static', 'Pulse', 'Quartz', 'Basalt', 'Cinder', 'Harbor', 'Meadow', 'Canyon', 'Glacier', 'Lantern', 'Pebble', 'Maple', 'Cedar', 'Willow', 'Breeze', 'Thunder', 'Summit', 'Island', 'Horizon', 'Voyager', 'Drifter'];
/** Nice-sounding single words, usable as a nickname on their own. */
const WORDS = ['Aurora', 'Solstice', 'Willow', 'Harbor', 'Meadow', 'Lantern', 'Ember', 'Zephyr', 'Horizon', 'Juniper', 'Cascade', 'Mirage', 'Serenity', 'Twilight', 'Velvet', 'Wanderer', 'Marble', 'Saffron', 'Tundra', 'Whisper', 'Nimbus', 'Eclipse', 'Orchid', 'Sapphire', 'Voyage', 'Compass', 'Rhapsody', 'Moonlight', 'Starling', 'Cobalt', 'Driftwood', 'Sundial', 'Paradox', 'Lullaby', 'Odyssey', 'Equinox', 'Monsoon', 'Tempest', 'Reverie', 'Halcyon', 'Gossamer', 'Obsidian', 'Evergreen', 'Daybreak', 'Nightfall', 'Silhouette', 'Stardust', 'Mistral', 'Citrine', 'Zenith'];

const pick = <T>(list: readonly T[]): T => list[randomInt(list.length)]!;
const num = (): string => (randomInt(3) === 0 ? String(randomInt(1, 10)) : String(randomInt(0, 100)).padStart(2, '0'));
const year = (): string => String(randomInt(88, 100));
/** One letter swapped for the digit it looks like: Frost becomes Fr0st. */
const leet = (w: string): string => {
	const at = [...w].flatMap((c, i) => (i > 0 && 'oei'.includes(c) ? [i] : []));
	if (at.length === 0) return w;
	const i = pick(at);
	return w.slice(0, i) + ({ o: '0', e: '3', i: '1' } as Record<string, string>)[w[i]!] + w.slice(i + 1);
};

/** Always 32 characters or fewer (Steam's limit). */
export function randomName(): string {
	const adj = pick(ADJECTIVES);
	const noun = pick(NOUNS);
	const other = pick(NOUNS);
	const forms: (() => string)[] = [
		() => `${adj}${noun}`,
		() => `${adj}${noun}`,
		() => `${adj}${noun}${num()}`,
		() => `${adj}${noun}${year()}`,
		() => `${noun}${other}`,
		() => `${adj.toLowerCase()}_${noun.toLowerCase()}`,
		() => `${noun.toLowerCase()}_${other.toLowerCase()}`,
		() => `${noun}${num()}`,
		() => `${pick(['x', 'i'])}${noun}`,
		() => `${noun}${noun.slice(-1).toLowerCase()}`,
		() => `The${noun}`,
		() => leet(noun),
		() => `${leet(adj)}${noun}`,
		() => noun,
		() => pick(WORDS),
		() => pick(WORDS),
		() => pick(WORDS),
		() => pick(WORDS).toLowerCase(),
		() => `${pick(WORDS)}${num()}`
	];
	return pick(forms)().slice(0, 32);
}
