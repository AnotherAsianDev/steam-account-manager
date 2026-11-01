import { describe, expect, it } from 'vitest';
import { cleanName, readEditForm, readPrivacy, renameProfile, setVisibility, uploadAvatar } from '../src/main/steamprofile';
import { extractPrivacy } from '../src/main/avatar';
import { randomName } from '../src/main/randomname';
import type { Http, HttpRequest } from '../src/main/trade';

const ID = '76561198626397763';
const enc = (o: unknown): string => JSON.stringify(o).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const editor = `<div id="profile_edit_config" data-profile-edit="${enc({ strPersonaName: 'Old Name', strRealName: 'Real', strSummary: 'About me', strCustomURL: 'mine', LocationData: { locCountryCode: 'CH', locStateCode: 'FR', locCityCode: '123' }, ProfilePreferences: { hide_profile_awards: true } })}"></div>`;
const settings = (profile: number) => `<div data-privacysettings="${enc({ PrivacySettings: { PrivacyProfile: profile, PrivacyInventory: 3, PrivacyInventoryGifts: 3, PrivacyOwnedGames: 2, PrivacyPlaytime: 3, PrivacyFriendsList: 2 }, eCommentPermission: 1 })}"></div>`;

function fake(pages: Record<string, string>, post: { status?: number; text: string } = { text: '{"success":1}' }): { http: Http; calls: HttpRequest[] } {
	const calls: HttpRequest[] = [];
	return { calls, http: async (req) => { calls.push(req); if (req.method === 'POST') return { status: post.status ?? 200, text: post.text }; const hit = Object.entries(pages).find(([k]) => req.url.includes(k)); return { status: hit ? 200 : 404, text: hit?.[1] ?? '' }; } };
}
const form = (r: HttpRequest): URLSearchParams => new URLSearchParams(String(r.body));

describe('visibility from the public profile', () => {
	it('reads public, friends only and private', () => {
		expect(extractPrivacy('<privacyState>public</privacyState>')).toBe('public');
		expect(extractPrivacy('<privacyState>friendsonly</privacyState>')).toBe('friends');
		expect(extractPrivacy('<privacyState>private</privacyState>')).toBe('private');
		expect(extractPrivacy('<visibilityState>2</visibilityState>')).toBe('friends');
		expect(extractPrivacy('<profile></profile>')).toBeUndefined();
	});
});

describe('profile editor', () => {
	it('reads every field so a rename can keep them', () => {
		expect(readEditForm(editor)).toMatchObject({ name: 'Old Name', real: 'Real', summary: 'About me', customUrl: 'mine', country: 'CH', state: 'FR', city: '123', hideAwards: true, exact: true });
		expect(readEditForm('<input name="personaName" value="naul">')).toMatchObject({ name: 'naul', exact: false });
		expect(readEditForm('<html></html>')).toBeUndefined();
	});
	it('renames and leaves the rest of the profile alone', async () => {
		const { http, calls } = fake({ '/edit': editor });
		expect(await renameProfile(http, ID, 'steamLoginSecure=x', '  New   Name ', false)).toBe('New Name');
		const post = form(calls.at(-1)!);
		expect(post.get('personaName')).toBe('New Name');
		expect(post.get('summary')).toBe('About me');
		expect(post.get('real_name')).toBe('Real');
		expect(post.get('country')).toBe('CH');
		expect(post.get('customURL')).toBe('mine');
		expect(post.get('hide_profile_awards')).toBe('1');
	});
	it('refuses to save an editor it cannot read completely, unless nothing is there to lose', async () => {
		const plain = '<input name="personaName" value="x">';
		await expect(renameProfile(fake({ '/edit': plain }).http, ID, 'c', 'New', false)).rejects.toThrow(/Nothing was changed/);
		await expect(renameProfile(fake({ '/edit': plain }).http, ID, 'c', 'New', true)).resolves.toBe('New');
	});
	it('shows what Steam says when it refuses', async () => {
		await expect(renameProfile(fake({ '/edit': editor }, { text: '{"success":2,"errmsg":"Too fast"}' }).http, ID, 'c', 'New', false)).rejects.toThrow('Too fast');
	});
	it('checks the name length', () => {
		expect(() => cleanName('')).toThrow();
		expect(() => cleanName('x'.repeat(33))).toThrow();
		expect(cleanName('x'.repeat(32))).toHaveLength(32);
	});
});

describe('visibility change', () => {
	it('reads the settings page', () => {
		expect(readPrivacy(settings(3))).toMatchObject({ settings: { PrivacyProfile: 3, PrivacyOwnedGames: 2 }, comments: 1 });
		expect(readPrivacy('<html></html>')).toBeUndefined();
	});
	it('makes everything private', async () => {
		const { http, calls } = fake({ '/edit/settings': settings(3) });
		await setVisibility(http, ID, 'c', 'private');
		const post = form(calls.at(-1)!);
		expect(calls.at(-1)!.url).toContain('/ajaxsetprivacy/');
		expect(Object.values(JSON.parse(post.get('Privacy')!) as Record<string, number>).every((v) => v === 1)).toBe(true);
	});
	it('can make a profile private even when the settings page cannot be read', async () => {
		const { http, calls } = fake({ '/edit/settings': '<html>new layout</html>' });
		await setVisibility(http, ID, 'c', 'private');
		expect(JSON.parse(form(calls.at(-1)!).get('Privacy')!)).toMatchObject({ PrivacyProfile: 1, PrivacyFriendsList: 1 });
	});
	it('makes only the profile public and keeps the rest', async () => {
		const { http, calls } = fake({ '/edit/settings': settings(1) });
		await setVisibility(http, ID, 'c', 'public');
		expect(JSON.parse(form(calls.at(-1)!).get('Privacy')!)).toMatchObject({ PrivacyProfile: 3, PrivacyOwnedGames: 2, PrivacyFriendsList: 2 });
	});
	it('does not guess when it cannot read the settings for going public', async () => {
		await expect(setVisibility(fake({ '/edit/settings': '<html>new layout</html>' }).http, ID, 'c', 'public')).rejects.toThrow(/Nothing was changed/);
	});
	it('reports a refusal', async () => {
		await expect(setVisibility(fake({ '/edit/settings': settings(3) }, { text: '{"success":0}' }).http, ID, 'c', 'private')).rejects.toThrow(/did not accept/);
	});
});

describe('profile picture', () => {
	it('sends the picture as a file upload with the fields Steam expects', async () => {
		const { http, calls } = fake({}, { text: '{"success":true}' });
		const image = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(50, 7)]);
		await uploadAvatar(http, ID, 'c', image);
		const req = calls.at(-1)!;
		const body = Buffer.from(req.body as Uint8Array);
		expect(req.url).toBe('https://steamcommunity.com/actions/FileUploader');
		expect(req.headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
		const text = body.toString('latin1');
		for (const part of ['name="type"\r\n\r\nplayer_avatar_image', `name="sId"\r\n\r\n${ID}`, 'name="avatar"; filename="avatar.jpg"']) expect(text).toContain(part);
		expect(body.includes(image)).toBe(true);
	});
	it('reports a refusal with Steam\'s words', async () => {
		await expect(uploadAvatar(fake({}, { text: '{"success":false,"message":"Image too small"}' }).http, ID, 'c', Buffer.alloc(10))).rejects.toThrow('Image too small');
	});
});

describe('random name', () => {
	it('is always a valid Steam name', () => {
		for (let i = 0; i < 300; i++) expect(() => cleanName(randomName())).not.toThrow();
	});
});

describe('random name looks like a person', () => {
	it('varies and never looks like a word list', () => {
		const names = new Set(Array.from({ length: 200 }, () => randomName()));
		expect(names.size).toBeGreaterThan(100);
		for (const n of names) expect(n).toMatch(/^[A-Za-z][A-Za-z0-9._ ]*$/);
	});
});
