import { randomInt } from 'node:crypto';

/** Short first names and pet forms, the part of a nickname people take from their own name. */
const STEMS = ['Luki', 'Jonny', 'Nico', 'Leo', 'Max', 'Finn', 'Timo', 'Jan', 'Ben', 'Luca', 'Noah', 'Elias', 'Felix', 'Marc', 'Sven', 'Dario', 'Enzo', 'Kevin', 'Alex', 'Tim', 'Chris', 'Sam', 'Robin', 'Dani', 'Domi', 'Fabi', 'Pascal', 'Reto', 'Mike', 'Tom', 'Eli', 'Lukas', 'Jonas', 'Moritz', 'Jannik', 'Kilian', 'Mattia', 'Raffi', 'Yannik', 'Simi',
	'Mia', 'Lena', 'Nina', 'Lea', 'Emma', 'Lara', 'Sophie', 'Jana', 'Alina', 'Noemi', 'Liv', 'Zoe', 'Lisa', 'Sara', 'Ella', 'Nele', 'Chiara', 'Selina'];
/** Words that gamers like in a nickname. */
const WORDS = ['Frost', 'Nova', 'Blaze', 'Echo', 'Rogue', 'Viper', 'Pixel', 'Turbo', 'Ghost', 'Storm', 'Vex', 'Zeno', 'Kilo', 'Orbit', 'Rex', 'Shadow', 'Wolf', 'Fox', 'Raven', 'Tiger', 'Hawk', 'Drift', 'Spark', 'Onyx', 'Cobra', 'Lynx', 'Atlas', 'Comet', 'Ember', 'Falcon', 'Hunter', 'Ninja', 'Sniper', 'Phantom', 'Titan', 'Jester', 'Bandit', 'Smoke', 'Rush', 'Flash', 'Cyber', 'Neon', 'Dusty', 'Salty', 'Lazy', 'Sleepy', 'Moody', 'Tilted', 'Cozy', 'Chill'];

const pick = <T>(list: readonly T[]): T => list[randomInt(list.length)]!;
const num = (): string => (randomInt(3) === 0 ? String(randomInt(1, 10)) : String(randomInt(0, 100)).padStart(2, '0'));
const year = (): string => String(randomInt(88, 100));
const letter = (): string => String.fromCharCode(65 + randomInt(26));

/**
 * A believable Steam nickname, the way people actually pick them: their own name with a number, a letter or a
 * gamer word, or just a gamer word. Always 32 characters or fewer (Steam's limit).
 */
export function randomName(): string {
	const stem = pick(STEMS);
	const word = pick(WORDS);
	const forms: (() => string)[] = [
		() => `${stem}${num()}`,
		() => `${stem}${year()}`,
		() => `${stem.toLowerCase()}_${num()}`,
		() => `${stem}${letter()}`,
		() => `x${stem}`,
		() => `${stem}x`,
		() => `${pick(['its', 'itz', 'i', 'mr', 'the'])}${stem.toLowerCase()}`,
		() => `${stem}${stem.slice(-1).toLowerCase()}`,
		() => `${word}${stem}`,
		() => `${stem}${word}`,
		() => `${stem.toLowerCase()}_${word.toLowerCase()}`,
		() => `${word}${num()}`,
		() => `The${pick(WORDS.slice(0, 40))}`,
		() => `${word}${word.slice(-1).toLowerCase()}`,
		() => `${stem.toLowerCase()}plays`,
		() => `${word}_${stem.toLowerCase()}`,
		() => stem,
		() => word
	];
	return pick(forms)().slice(0, 32);
}
