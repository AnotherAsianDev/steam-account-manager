import { describe, expect, it } from 'vitest';
import { sanitize } from '../src/main/settings';

describe('accent colour setting', () => {
	it('keeps a valid colour, lower-cased', () => expect(sanitize({ accent: '#4C8DFF' }).accent).toBe('#4c8dff'));
	it('falls back to the theme accent for anything else', () => {
		for (const bad of ['red', '#fff', '#12345g', 5, null, 'url(x)']) expect(sanitize({ accent: bad }).accent).toBe('');
	});
	it('an old glass theme setting becomes System', () => expect(sanitize({ theme: 'glass' }).theme).toBe('system'));
});
