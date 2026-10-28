import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'privacy.html', 'license.html'];

function load(page) {
  return new JSDOM(readFileSync(join(ROOT, page), 'utf8')).window.document;
}

const isExternal = (value) => /^(https?:|mailto:|tel:)/.test(value);

describe.each(PAGES)('%s', (page) => {
  const doc = load(page);

  it('has a language, a title, a description and a skip link first', () => {
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.title.trim().length).toBeGreaterThan(5);
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')?.length).toBeGreaterThan(20);
    const firstLink = doc.querySelector('a');
    expect(firstLink?.getAttribute('class')).toContain('skip');
    expect(firstLink?.getAttribute('href')).toBe('#main');
    expect(doc.getElementById('main')).not.toBeNull();
  });

  it('has exactly one h1 and no skipped heading levels', () => {
    const levels = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    levels.reduce((previous, level) => {
      expect(level, `heading level jumps from ${previous} to ${level}`).toBeLessThanOrEqual(previous + 1);
      return level;
    }, 1);
  });

  it('points every local link, image and stylesheet at an existing file', () => {
    const values = [
      ...[...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      ...[...doc.querySelectorAll('link[href]')].map((l) => l.getAttribute('href')),
      ...[...doc.querySelectorAll('img[src]')].map((i) => i.getAttribute('src')),
      ...[...doc.querySelectorAll('img[srcset]')].flatMap((i) =>
        i.getAttribute('srcset').split(',').map((part) => part.trim().split(/\s+/)[0])),
    ];
    for (const value of values) {
      if (isExternal(value) || value.startsWith('#')) continue;
      const file = value.split('#')[0] || 'index.html';
      const target = file === './' ? 'index.html' : file;
      expect(existsSync(join(ROOT, target)), `${page}: ${value}`).toBe(true);
    }
  });

  it('has a target for every in-page anchor', () => {
    for (const a of doc.querySelectorAll('a[href^="#"]')) {
      const id = a.getAttribute('href').slice(1);
      expect(doc.getElementById(id), `${page}: #${id}`).not.toBeNull();
    }
  });

  it('gives every image an alt attribute, and real images a size', () => {
    for (const img of doc.querySelectorAll('img')) {
      expect(img.hasAttribute('alt'), img.getAttribute('src')).toBe(true);
      expect(img.getAttribute('width'), img.getAttribute('src')).toBeTruthy();
      expect(img.getAttribute('height'), img.getAttribute('src')).toBeTruthy();
      if (img.getAttribute('alt') !== '') {
        expect(img.getAttribute('alt').length, img.getAttribute('src')).toBeGreaterThan(20);
      }
    }
  });

  it('has no scripts, no inline styles and no external resources (the Content Security Policy forbids them)', () => {
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(doc.querySelectorAll('style')).toHaveLength(0);
    expect(doc.querySelectorAll('[style]')).toHaveLength(0);
    for (const el of doc.querySelectorAll('link[href], img[src]')) {
      expect(isExternal(el.getAttribute('href') ?? el.getAttribute('src') ?? ''), page).toBe(false);
    }
  });

  it('keeps the project language English', () => {
    expect(readFileSync(join(ROOT, page), 'utf8')).not.toMatch(/[Ѐ-ӿ]/);
  });
});

describe('license and privacy pages', () => {
  it('shows the same text as LICENSE on the license page', () => {
    const license = readFileSync(join(ROOT, 'LICENSE'), 'utf8').trim();
    const shown = load('license.html').querySelector('.legal pre')?.textContent?.trim();
    expect(shown).toBe(license);
    expect(license).toContain('MIT License');
    expect(license).toContain('Copyright (c) 2026 Konstantin Beregovoy');
  });

  it('links the license page from the home page', () => {
    const hrefs = [...load('index.html').querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('license.html');
    expect(hrefs).toContain('privacy.html');
  });

  it('names the three permissions and the saved settings in the privacy policy', () => {
    const text = load('privacy.html').body.textContent;
    for (const word of ['activeTab', 'scripting', 'storage', 'role filter', 'AAA']) {
      expect(text, word).toContain(word);
    }
    expect(text).toContain('collects nothing and sends nothing');
  });
});

describe('site files', () => {
  it('has a strict Content Security Policy and the images the pages use', () => {
    const headers = readFileSync(join(ROOT, '_headers'), 'utf8');
    expect(headers).toContain("default-src 'none'");
    expect(headers).toContain("style-src 'self'");
    expect(headers).not.toContain('unsafe-inline');
    expect(readdirSync(join(ROOT, 'assets')).filter((name) => name.endsWith('.webp')).length).toBeGreaterThanOrEqual(12);
  });

  it('keeps the colors as tokens in :root, light and dark', () => {
    const css = readFileSync(join(ROOT, 'style.css'), 'utf8');
    expect(css).toContain(':root');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain(':focus-visible');
  });
});
