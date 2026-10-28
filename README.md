# Plain A11y website

The static website of Plain A11y, a Chrome extension that checks a page for accessibility problems and explains them in plain language. The extension itself lives in its own repository.

The site has no scripts, no cookies, no analytics, no external fonts and no build step: it is plain HTML and CSS, so Cloudflare Pages can publish the folder as it is.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The landing page |
| `privacy.html` | The privacy policy (the public address the Chrome Web Store asks for) |
| `license.html` | The MIT License text and the third-party notices |
| `style.css` | All styles. Colors and sizes are tokens at the top, in `:root` |
| `assets/` | Images (WebP in two sizes) and the logo |
| `_headers` | Security headers for Cloudflare Pages (a strict Content Security Policy) |
| `robots.txt` | Lets search engines in |
| `LICENSE` | MIT License of this repository |
| `tests/` | Checks that keep the site correct (see below) |

All links are relative, so the folder works at the root of a subdomain and in a subfolder of another site.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Checks

```bash
npm install
npm test
```

The tests check that every local link and image exists, every in-page anchor has a target, every image has an alternative text, each page has one `h1` and no skipped heading levels, there are no scripts and no inline styles (the Content Security Policy forbids them), the license page contains the same text as `LICENSE`, and the project language stays English.

## Deploy to Cloudflare Pages

1. In the Cloudflare dashboard open **Workers & Pages**, then **Create**, then **Pages**, then **Connect to Git**, and choose this repository.
2. Build settings: framework preset **None**, build command **empty**, build output directory **`/`** (the root of the repository).
3. Save and deploy. After that every push to the production branch (`main`) is published automatically, and every other branch gets its own preview address.
4. Open the project, then **Custom domains**, then **Set up a custom domain**, and enter the subdomain, for example `a11y-ext.example.com`. If the domain is managed by Cloudflare, the DNS record is created for you.

The `_headers` file is read by Cloudflare Pages when this repository is its own project. If you copy the folder into another site instead, move those rules into that site's header settings.

## Keeping it in sync with the extension

- `privacy.html` repeats `PRIVACY.md` from the extension repository. Change both together.
- `license.html` repeats the `LICENSE` of the extension. They are the same MIT text, and a test fails if `LICENSE` and `license.html` differ.
- The screenshots in `assets/` come from the extension repository (`store/screenshots`). The extension repository has a script that makes the WebP files: `npm run site-assets`.
- Before publishing, replace the two marked places: the Chrome Web Store link (the text “coming soon” on the home page) and the GitHub link (the comment in the “Open source” section).

## License

MIT, see `LICENSE`.
