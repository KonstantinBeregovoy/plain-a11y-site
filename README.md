# Plain A11y website

The static website of Plain A11y, a Chrome extension that checks a page for accessibility problems and explains them in plain language. The extension itself lives in its own repository.

The site has the same look as [bereg.dev](https://bereg.dev) (dark "Engineering Blueprint", IBM Plex), but it is plain HTML and CSS: no framework, no build step, no scripts, no cookies, no analytics and no external resources.

## Files

Only the `public/` folder is published. Everything else (tests, README, config) is never served.

| File | What it is |
| --- | --- |
| `public/index.html` | The landing page |
| `public/privacy.html` | The privacy policy (the public address the Chrome Web Store asks for) |
| `public/license.html` | The MIT License text, the third-party notices and the font license |
| `public/404.html` | The page for unknown addresses |
| `public/style.css` | All styles. The colors and sizes are tokens at the top, in `:root` |
| `public/fonts/` | IBM Plex Sans and Mono (the same files as on bereg.dev) and their license `OFL.txt` |
| `public/assets/` | Screenshots (WebP in two sizes) and the logo |
| `public/_headers` | Security headers (a strict Content Security Policy) |
| `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt` | Lets search engines in, lists the three indexable pages, and gives AI assistants a short summary with links |
| `public/.well-known/security.txt` | Where to report a security problem. Renew the `Expires` date once a year |
| `public/favicon.ico`, `public/apple-touch-icon.png`, `public/assets/og.png` | Icons and the 1200×630 sharing image |
| `wrangler.jsonc` | Cloudflare Workers config: publish `public/`, unknown addresses get `404.html` |
| `LICENSE` | MIT License of this repository |
| `tests/` | Checks that keep the site correct (see below) |

All links are relative, so the `public/` folder also works inside a subfolder of another site.

## Design

The design follows `src/styles/global.css` of the bereg.dev repository: the same tokens (`--bg`, `--surface`, `--text`, `--muted`, `--line`, `--accent`, `--amber`), the same fonts, the same header, footer, numbered section heads, cards with corner ticks and mono labels. The theme is dark only, like bereg.dev. If the design of bereg.dev changes, change the tokens at the top of `public/style.css`; a test pins the current values, so update it together with them.

The pointer "lamp" effect of bereg.dev is not used here, because this site has no JavaScript.

## Preview locally

```bash
python3 -m http.server 8080 --directory public
```

Then open http://localhost:8080.

## Checks

```bash
npm install
npm test
```

The tests check that every local link and image exists, every in-page anchor has a target, every image has an alternative text and a size, each page has one `h1` and no skipped heading levels, there are no scripts and no inline styles (the Content Security Policy forbids them), the license page contains the same text as `LICENSE`, the design tokens of bereg.dev are in place, the fonts come from the site itself with their license, and the project language stays English.

## Deploy to Cloudflare (Workers with static assets, the same way as bereg.dev)

1. In the Cloudflare dashboard open **Workers & Pages**, then **Create**, then import this repository from GitHub (Workers Builds). The project name must be `plain-a11y-site`, the same as `name` in `wrangler.jsonc`.
2. Build settings: **build command empty**, deploy command `npx wrangler deploy` (the default). There is nothing to build: `wrangler.jsonc` publishes the `public/` folder as it is.
3. Save and deploy. After that every push to `main` is published automatically (about a minute), and every other branch gets its own preview address. To roll back, open the Worker, then Deployments, and choose a previous version.
4. Open the Worker, then **Settings**, then **Domains & Routes**, then add a custom domain, for example `a11y-ext.bereg.dev`. The `bereg.dev` zone is on Cloudflare, so the DNS record is created for you.
5. Turn off the `workers.dev` address of the Worker, so that the site does not exist at two addresses.

The names of the buttons in the dashboard change from time to time; the idea stays the same. The `_headers` file inside `public/` is read by Cloudflare when this repository is its own project.

## Keeping it in sync with the extension

- `public/privacy.html` repeats `PRIVACY.md` from the extension repository. Change both together.
- `public/license.html` repeats the `LICENSE` of the extension. They are the same MIT text, and a test fails if `LICENSE` and `license.html` differ.
- The screenshots in `public/assets/` come from the extension repository (`store/screenshots`). The extension repository has a script that makes the WebP files: `npm run site-assets -- <path to this repository>/public/assets`.
- Before publishing, replace the two marked places: the Chrome Web Store link (the text “coming soon” on the home page) and the GitHub link (the comment in the “Open source” section).

## License

MIT, see `LICENSE`. The fonts keep their own license, see `public/fonts/OFL.txt`.
