import { randomBytes } from 'node:crypto';
import { UserError } from './errors';
import { BROWSER, checkStatus, type Http } from './trade';

/**
 * Changing what the Steam Community profile of an account shows: name, picture, visibility.
 *
 * Steam has no official interface for this; the calls below are the ones its own website
 * makes. They can change, so every step says in plain words where it failed.
 */
const HOST = 'https://steamcommunity.com';

const decode = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

interface Session {
	headers: Record<string, string>;
	sessionId: string;
}
function session(cookie: string): Session {
	const sessionId = randomBytes(12).toString('hex');
	return { sessionId, headers: { 'User-Agent': BROWSER, Cookie: `${cookie}; sessionid=${sessionId}` } };
}

/** GET that follows Steam's redirects inside steamcommunity.com but never to a sign-in page. */
async function open(http: Http, url: string, headers: Record<string, string>): Promise<{ status: number; text: string }> {
	let res = await http({ method: 'GET', url, headers });
	for (let hop = 0; hop < 3 && res.status >= 300 && res.status < 400 && res.location; hop++) {
		const next = new URL(res.location, url);
		if (next.protocol !== 'https:' || next.hostname !== 'steamcommunity.com' || /\/login/i.test(next.pathname)) break;
		res = await http({ method: 'GET', url: next.toString(), headers });
	}
	return res;
}

/** What the profile editor holds. `exact` is false when only the name could be read, so the rest is unknown. */
export interface EditForm {
	name: string;
	real: string;
	summary: string;
	country: string;
	state: string;
	city: string;
	customUrl: string;
	hideAwards: boolean;
	exact: boolean;
}
export function readEditForm(html: string): EditForm | undefined {
	const raw = /data-profile-edit="([^"]*)"/.exec(html)?.[1];
	if (raw) {
		try {
			const j = JSON.parse(decode(raw)) as Record<string, any>;
			const loc = (j['LocationData'] ?? {}) as Record<string, unknown>;
			return { name: text(j['strPersonaName']), real: text(j['strRealName']), summary: text(j['strSummary']), country: text(loc['locCountryCode']), state: text(loc['locStateCode']), city: text(loc['locCityCode']), customUrl: text(j['strCustomURL']), hideAwards: !!(j['ProfilePreferences'] as Record<string, unknown> | undefined)?.['hide_profile_awards'], exact: true };
		} catch {
			/* fall through to the plain form */
		}
	}
	const name = /name="personaName"[^>]*value="([^"]*)"/.exec(html)?.[1] ?? /value="([^"]*)"[^>]*name="personaName"/.exec(html)?.[1];
	return name === undefined ? undefined : { name: decode(name), real: '', summary: 'No information given.', country: '', state: '', city: '', customUrl: '', hideAwards: false, exact: false };
}

/** Steam's answer to a form post: an error text when it gives one. */
function failure(body: string): string | undefined {
	try {
		const j = JSON.parse(body) as Record<string, unknown>;
		const ok = j['success'] === 1 || j['success'] === true;
		const msg = (text(j['errmsg']) || (ok ? '' : text(j['message'] ?? j['strError']))).trim();
		return msg ? msg.slice(0, 300) : undefined;
	} catch {
		return undefined;
	}
}

async function saveProfile(http: Http, steamId: string, s: Session, edit: string, f: EditForm): Promise<void> {
	const form = new URLSearchParams({ sessionID: s.sessionId, type: 'profileSave', personaName: f.name, real_name: f.real, summary: f.summary, country: f.country, state: f.state, city: f.city, customURL: f.customUrl, json: '1', hide_profile_awards: f.hideAwards ? '1' : '0' });
	const saved = await http({ method: 'POST', url: `${HOST}/profiles/${steamId}/edit/`, headers: { ...s.headers, 'Content-Type': 'application/x-www-form-urlencoded', Origin: HOST, Referer: edit }, body: form.toString() });
	checkStatus(saved.status, 'saving the profile');
	const why = failure(saved.text);
	if (why) throw new UserError(`Steam said: ${why}`);
}

async function openEditor(http: Http, steamId: string, s: Session): Promise<{ edit: string; html: string }> {
	const edit = `${HOST}/profiles/${steamId}/edit?welcomed=1`;
	const res = await open(http, edit, s.headers);
	checkStatus(res.status, 'opening the profile editor');
	if (!/name="personaName"|profile[_-]edit|edit_profile/i.test(res.text)) throw new UserError('Steam did not open the profile editor. Sign in again on the account page and retry');
	return { edit, html: res.text };
}

/** The same as the "Set Up Steam Profile" button on the Steam website: the form is saved as Steam shows it. */
export async function setupProfile(http: Http, steamId: string, cookie: string): Promise<void> {
	const s = session(cookie);
	const { edit, html } = await openEditor(http, steamId, s);
	const f = readEditForm(html);
	await saveProfile(http, steamId, s, edit, { ...(f ?? { name: '', real: '', country: '', state: '', city: '', customUrl: '', hideAwards: false, exact: false }), summary: f?.exact ? f.summary : 'No information given.' });
}

export const NAME_MAX = 32;
export function cleanName(raw: string): string {
	// eslint-disable-next-line no-control-regex
	const name = raw.replace(/[\u0000-\u001f\u007f​-‏⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
	if (!name || [...name].length > NAME_MAX) throw new UserError(`The name needs 1 to ${NAME_MAX} characters`);
	return name;
}

/** Changes the profile name and keeps everything else of the profile as it is. `unset`: the profile was never set up, so there is nothing to lose. */
export async function renameProfile(http: Http, steamId: string, cookie: string, rawName: string, unset: boolean): Promise<string> {
	const name = cleanName(rawName);
	const s = session(cookie);
	const { edit, html } = await openEditor(http, steamId, s);
	const f = readEditForm(html);
	if (!f) throw new UserError('Steam did not show the name field of the profile editor. Nothing was changed');
	if (!f.exact && !unset) throw new UserError('Steam\'s profile editor looks different than expected. Nothing was changed, because saving could erase the summary or location of this profile');
	await saveProfile(http, steamId, s, edit, { ...f, name, ...(f.exact ? {} : { summary: 'No information given.' }) });
	return name;
}

// ---------------------------------------------------------------- visibility --

export type Visibility = 'private' | 'public';
const PRIVACY_KEYS = ['PrivacyProfile', 'PrivacyInventory', 'PrivacyInventoryGifts', 'PrivacyOwnedGames', 'PrivacyPlaytime', 'PrivacyFriendsList'];

function findKey(o: unknown, key: string, depth = 0): Record<string, unknown> | undefined {
	if (!o || typeof o !== 'object' || depth > 4) return undefined;
	const rec = o as Record<string, unknown>;
	if (key in rec && rec[key] && typeof rec[key] === 'object') return rec[key] as Record<string, unknown>;
	for (const v of Object.values(rec)) {
		const hit = findKey(v, key, depth + 1);
		if (hit) return hit;
	}
	return undefined;
}

/** The privacy settings the profile's settings page carries (a number per setting: 1 private, 2 friends only, 3 public). */
export function readPrivacy(html: string): { settings: Record<string, number>; comments: number | undefined } | undefined {
	for (const m of html.matchAll(/data-[\w-]+="([^"]*PrivacySettings[^"]*)"/g)) {
		try {
			const j: unknown = JSON.parse(decode(m[1]!));
			const raw = findKey(j, 'PrivacySettings');
			if (!raw) continue;
			const settings: Record<string, number> = {};
			for (const [k, v] of Object.entries(raw)) if (typeof v === 'number') settings[k] = v;
			if (settings['PrivacyProfile'] === undefined) continue;
			const c = (j as Record<string, unknown>)['eCommentPermission'] ?? findKey(j, 'eCommentPermission');
			return { settings, comments: typeof c === 'number' ? c : undefined };
		} catch {
			/* try the next attribute */
		}
	}
	return undefined;
}

/**
 * Private: the profile and everything under it (inventory, games, friends) goes private.
 * Public: only the profile itself opens up; what is under it stays as the account has it.
 */
export async function setVisibility(http: Http, steamId: string, cookie: string, target: Visibility): Promise<void> {
	const s = session(cookie);
	const page = `${HOST}/profiles/${steamId}/edit/settings`;
	const res = await open(http, page, s.headers);
	checkStatus(res.status, 'opening the privacy settings');
	const current = readPrivacy(res.text);
	if (target === 'public' && !current) throw new UserError('Steam did not show the privacy settings. Nothing was changed');
	const settings: Record<string, number> = target === 'private' ? { ...current?.settings, ...Object.fromEntries(PRIVACY_KEYS.map((k) => [k, 1])) } : { ...current!.settings, PrivacyProfile: 3 };
	const comments = target === 'private' ? 2 : current?.comments ?? 1;
	const body = new URLSearchParams({ sessionid: s.sessionId, Privacy: JSON.stringify(settings), eCommentPermission: String(comments) }).toString();
	const saved = await http({ method: 'POST', url: `${HOST}/profiles/${steamId}/ajaxsetprivacy/`, headers: { ...s.headers, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Origin: HOST, Referer: page }, body });
	checkStatus(saved.status, 'saving the privacy settings');
	let reply: Record<string, unknown>;
	try {
		reply = JSON.parse(saved.text) as Record<string, unknown>;
	} catch {
		throw new UserError('Steam sent an answer that could not be read. Read the profile again to see whether it changed');
	}
	if (reply['success'] !== 1 && reply['success'] !== true) throw new UserError(failure(saved.text) ? `Steam said: ${failure(saved.text)}` : 'Steam did not accept the change');
}

// ------------------------------------------------------------------- picture --

const PHOTO_MIN = 4_000;
const PHOTO_MAX = 900_000;
/** A random photo from the web (picsum.photos serves a different free-to-use photo on every request). */
export async function randomPhoto(): Promise<Buffer> {
	const res = await fetch(`https://picsum.photos/600/600.jpg?random=${randomBytes(6).toString('hex')}`, { signal: AbortSignal.timeout(20_000) });
	if (!res.ok) throw new UserError(`The picture source answered HTTP ${res.status}. Try again`);
	const image = Buffer.from(await res.arrayBuffer());
	if (image.length < PHOTO_MIN || image.length > PHOTO_MAX || image[0] !== 0xff || image[1] !== 0xd8) throw new UserError('The picture source did not return a usable picture. Try again');
	return image;
}

/** Uploads a JPEG as the profile picture, like the "Upload your avatar" button on the profile editor. */
export async function uploadAvatar(http: Http, steamId: string, cookie: string, image: Buffer): Promise<void> {
	const s = session(cookie);
	const edit = `${HOST}/profiles/${steamId}/edit/avatar`;
	const boundary = `----Authenticator${randomBytes(8).toString('hex')}`;
	const field = (name: string, value: string): Buffer => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
	const body = Buffer.concat([
		field('MAX_FILE_SIZE', String(image.length)),
		field('type', 'player_avatar_image'),
		field('sId', steamId),
		field('sessionid', s.sessionId),
		field('doSub', '1'),
		field('json', '1'),
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="avatar.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
		image,
		Buffer.from(`\r\n--${boundary}--\r\n`)
	]);
	const res = await http({ method: 'POST', url: `${HOST}/actions/FileUploader`, headers: { ...s.headers, 'Content-Type': `multipart/form-data; boundary=${boundary}`, Origin: HOST, Referer: edit }, body });
	checkStatus(res.status, 'uploading the picture');
	let reply: Record<string, unknown>;
	try {
		reply = JSON.parse(res.text) as Record<string, unknown>;
	} catch {
		throw new UserError('Steam sent an answer that could not be read. Read the profile again to see whether the picture changed');
	}
	if (reply['success'] !== true && reply['success'] !== 1) throw new UserError(failure(res.text) ? `Steam said: ${failure(res.text)}` : 'Steam did not accept the picture');
}
