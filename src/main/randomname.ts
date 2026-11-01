import { randomInt } from 'node:crypto';

const FIRST = ['Lukas', 'Jonas', 'Noah', 'Leon', 'Luca', 'Elias', 'Finn', 'Tim', 'Nico', 'Marco', 'David', 'Daniel', 'Simon', 'Julian', 'Fabian', 'Dominik', 'Patrick', 'Sven', 'Marc', 'Andre', 'Kevin', 'Alex', 'Max', 'Ben', 'Jan', 'Felix', 'Moritz', 'Oliver', 'Thomas', 'Michael', 'Stefan', 'Reto', 'Pascal', 'Raphael', 'Dario', 'Mattia', 'Enzo', 'Liam', 'Ethan', 'Jack', 'Ryan', 'Tom', 'Chris', 'Sam', 'Adrian', 'Samuel', 'Emil', 'Philipp', 'Robin', 'Yannick',
	'Emma', 'Mia', 'Lena', 'Anna', 'Laura', 'Sarah', 'Julia', 'Lara', 'Nina', 'Sophie', 'Lea', 'Elena', 'Giulia', 'Chiara', 'Alina', 'Jana', 'Selina', 'Noemi', 'Livia', 'Amelie', 'Hannah', 'Clara', 'Sara', 'Eva', 'Marie', 'Lisa', 'Vanessa', 'Melanie', 'Jessica', 'Katrin'];
const LAST = ['Meier', 'Keller', 'Weber', 'Huber', 'Schmid', 'Fischer', 'Brunner', 'Baumann', 'Gerber', 'Frei', 'Moser', 'Zimmermann', 'Steiner', 'Roth', 'Graf', 'Widmer', 'Lehmann', 'Berger', 'Koch', 'Wagner', 'Becker', 'Hoffmann', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Braun', 'Hartmann', 'Marti', 'Egger', 'Bachmann', 'Vogel', 'Roger', 'Rossi', 'Bianchi', 'Costa', 'Silva', 'Novak'];

const pick = <T>(list: readonly T[]): T => list[randomInt(list.length)]!;
const year = (): string => String(randomInt(88, 100));

/**
 * A believable profile name, the way people actually name themselves: a first name alone, with an initial or a surname,
 * a lower-case handle, or a name with a number or birth year. Always 32 characters or fewer (Steam's limit).
 */
export function randomName(): string {
	const first = pick(FIRST);
	const last = pick(LAST);
	const lower = first.toLowerCase();
	const forms: (() => string)[] = [
		() => first,
		() => first,
		() => `${first} ${last[0]}.`,
		() => `${first} ${last}`,
		() => `${first} ${last}`,
		() => `${lower}_${last.toLowerCase()}`,
		() => `${lower}.${last.toLowerCase()}`,
		() => `${lower}${year()}`,
		() => `${first}${randomInt(2, 100)}`,
		() => `${lower}_${randomInt(1, 100)}`,
		() => `${first[0]!.toLowerCase()}${last.toLowerCase()}`,
		() => `${first} ${last[0]}`
	];
	return pick(forms)().slice(0, 32);
}
