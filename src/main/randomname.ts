import { randomInt } from 'node:crypto';

const FIRST = ['Quiet', 'Silent', 'Swift', 'Lucky', 'Rusty', 'Frozen', 'Hidden', 'Misty', 'Golden', 'Silver', 'Crimson', 'Cosmic', 'Lazy', 'Brave', 'Calm', 'Wild', 'Mellow', 'Sunny', 'Dusty', 'Gentle', 'Clever', 'Happy', 'Shy', 'Bright', 'Stormy', 'Velvet', 'Amber', 'Cobalt', 'Hazel', 'Mossy', 'Nimble', 'Proud', 'Tiny', 'Wandering', 'Winter', 'Summer', 'Midnight', 'Copper', 'Ivory', 'Jolly'];
const SECOND = ['Falcon', 'Otter', 'Fox', 'Panda', 'Lynx', 'Owl', 'Badger', 'Heron', 'Wolf', 'Raven', 'Comet', 'River', 'Meadow', 'Harbor', 'Pebble', 'Maple', 'Cedar', 'Willow', 'Ember', 'Breeze', 'Canyon', 'Glacier', 'Lantern', 'Sparrow', 'Tiger', 'Koala', 'Dolphin', 'Pine', 'Thunder', 'Orchard', 'Voyager', 'Wanderer', 'Pilot', 'Ranger', 'Sailor', 'Drifter', 'Echo', 'Horizon', 'Island', 'Summit'];

/** A harmless made-up name like "Quiet Falcon" or "Rusty Otter 42" (always 32 characters or fewer, which is what Steam allows). */
export function randomName(): string {
	const name = `${FIRST[randomInt(FIRST.length)]} ${SECOND[randomInt(SECOND.length)]}`;
	return randomInt(2) === 0 ? name : `${name} ${randomInt(10, 100)}`;
}
