import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
// The folder that is published: nothing outside it is served.
const ROOT = join(REPO, 'public');
const PAGES = ['index.html', 'privacy.html', 'license.html', '404.html'];

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

  it('follows the title pattern and the author tag of bereg.dev', () => {
    expect(doc.title.endsWith(' | Konstantin Beregovoy'), doc.title).toBe(true);
    expect(doc.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('Konstantin Beregovoy');
    expect(doc.querySelector('meta[name="robots"]')).not.toBeNull();
  });

  it('has the footer of bereg.dev: copyright, LinkedIn and GitHub of the author, and a link to the main site', () => {
    const footer = doc.querySelector('footer.site');
    expect(footer?.textContent).toContain('© 2026 Konstantin Beregovoy');
    const links = Object.fromEntries([...footer.querySelectorAll('a')].map((a) => [a.textContent.trim(), a]));
    expect(links['LinkedIn']?.getAttribute('href')).toBe('https://www.linkedin.com/in/konstantin-beregovoy/');
    expect(links['GitHub']?.getAttribute('href')).toBe('https://github.com/KonstantinBeregovoy');
    expect(links['LinkedIn']?.getAttribute('rel')).toBe('me');
    expect(links['GitHub']?.getAttribute('rel')).toBe('me');
    expect(links['bereg.dev']?.getAttribute('href')).toBe('https://bereg.dev');
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
      const file = (value.split('#')[0] || 'index.html').replace(/^\//, '');
      const target = file === './' || file === '' ? 'index.html' : file;
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
    const license = readFileSync(join(REPO, 'LICENSE'), 'utf8').trim();
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

  it('gives a contact address in the privacy policy', () => {
    const mail = load('privacy.html').querySelector('a[href^="mailto:"]');
    expect(mail?.getAttribute('href')).toBe('mailto:contact@bereg.dev');
  });
});

describe('site files', () => {
  it('has a strict Content Security Policy that allows only the site itself', () => {
    const headers = readFileSync(join(ROOT, '_headers'), 'utf8');
    expect(headers).toContain("default-src 'none'");
    expect(headers).toContain("style-src 'self'");
    expect(headers).toContain("font-src 'self'");
    expect(headers).not.toContain('unsafe-inline');
    expect(headers).not.toContain('unsafe-eval');
    expect(headers).toContain('Strict-Transport-Security');
  });

  it('ships the images the pages use', () => {
    expect(readdirSync(join(ROOT, 'assets')).filter((name) => name.endsWith('.webp')).length).toBeGreaterThanOrEqual(12);
  });

  it('keeps the design of bereg.dev: dark Engineering Blueprint tokens and IBM Plex in :root', () => {
    const css = readFileSync(join(ROOT, 'style.css'), 'utf8');
    for (const token of ['--bg: #0a1220', '--surface: #0d1829', '--text: #dbe6f5', '--muted: #8ea3bf', '--line: #1f3350', '--accent: #78c2ff', '--amber: #f2b45e']) {
      expect(css, token).toContain(token);
    }
    expect(css).toContain('color-scheme: dark');
    expect(css).toContain("'IBM Plex Sans'");
    expect(css).toContain("'IBM Plex Mono'");
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors');
    expect(css).toContain(':focus-visible');
  });

  it('serves the fonts from the site itself, with the license next to them', () => {
    const css = readFileSync(join(ROOT, 'style.css'), 'utf8');
    for (const url of css.matchAll(/url\('([^']+)'\)/g)) {
      expect(url[1].startsWith('http'), url[1]).toBe(false);
      expect(existsSync(join(ROOT, url[1])), url[1]).toBe(true);
    }
    expect(readFileSync(join(ROOT, 'fonts', 'OFL.txt'), 'utf8')).toContain('SIL OPEN FONT LICENSE');
  });

  it('publishes only the public folder on Cloudflare', () => {
    const config = readFileSync(join(REPO, 'wrangler.jsonc'), 'utf8');
    expect(config).toContain('"directory": "./public"');
    expect(config).toContain('"not_found_handling": "404-page"');
    expect(existsSync(join(ROOT, '404.html'))).toBe(true);
  });
});

describe('install section', () => {
  const doc = load('index.html');

  it('tells how to get the source: a clone command and a link to the public repository', () => {
    const code = doc.querySelector('#install pre code')?.textContent ?? '';
    expect(code).toContain('git clone https://github.com/KonstantinBeregovoy/plain-a11y.git');
    expect(code.indexOf('git clone')).toBeLessThan(code.indexOf('npm install'));
    const hrefs = [...doc.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://github.com/KonstantinBeregovoy/plain-a11y');
  });

  it('has no leftover placeholder comments', () => {
    expect(readFileSync(join(ROOT, 'index.html'), 'utf8')).not.toMatch(/<!--[^>]*(Add|TODO|once it is public)/i);
  });
});
