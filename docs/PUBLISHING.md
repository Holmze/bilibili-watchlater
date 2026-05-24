# Publishing Guide

## Pre-Release Checks

Run local checks:

```bash
node --check src/background.js
node --check src/bilibili.js
node --check src/content-space.js
node --check src/page-add.js
node --check src/storage.js
node --check src/sync.js
node --check popup/popup.js
node --check options/options.js
node --test tests/*.test.js
python3 -m json.tool manifest.json
```

Manual browser checks:

1. Reload the unpacked extension.
2. Confirm Bilibili login diagnostics pass.
3. Add one UP owner.
4. Run dry-run sync.
5. Run one manual live sync with one UP owner and small page size.
6. Confirm the video appears in Watch Later.
7. Enable auto sync in dry-run mode and confirm no errors.
8. Test `Add to Watchlater Bot` on a `space.bilibili.com/{mid}` page.

## Package Contents

Include:

- `manifest.json`
- `src/`
- `popup/`
- `options/`
- icons/assets, once added

Do not include:

- `tests/`
- `docs/`
- `README.md`
- `.git/`
- temporary files
- screenshots source files unless required

## Chrome Web Store Notes

Before publishing, prepare:

- 128x128 extension icon.
- Store screenshots.
- Privacy policy URL.
- Permission justifications.
- Single purpose statement.

Chrome Web Store requires privacy practice disclosures and Limited Use certification for extensions that handle user data.

## Publish To Chrome Web Store

1. Create a Chrome Web Store developer account.
2. Open the Chrome Web Store Developer Dashboard.
3. Create a new item.
4. Upload `bilibili-watchlater-extension.zip`.
5. Fill in the store listing using `docs/STORE_LISTING.md`.
6. Upload assets from `assets/store/`:
   - `assets/store/screenshots/*.png`
   - `assets/store/promo/small-promo-440x280.png`
   - `assets/store/promo/large-promo-1400x560.png`
7. Add the privacy policy URL. You can host `docs/PRIVACY.md` with GitHub Pages or another public site.
8. Complete privacy practices and Limited Use certification in the dashboard.
9. Confirm permission justifications match `manifest.json`.
10. Submit for review.

Important: the Developer Dashboard requires the privacy policy to be reachable as a public URL. A local file path is not accepted.

## Publish To Microsoft Edge Add-ons

1. Create or sign in to a Microsoft Partner Center account.
2. Open the Microsoft Edge Add-ons submission dashboard.
3. Create a new extension submission.
4. Upload `bilibili-watchlater-extension.zip`.
5. Fill in the product listing using `docs/STORE_LISTING.md`.
6. Upload assets from `assets/store/`:
   - screenshots from `assets/store/screenshots/`
   - logo from `assets/store/edge/logo-300x300.png`
7. Add a public privacy policy URL.
8. Fill in permission and data-use disclosures.
9. Submit for certification.

Edge can usually ingest Chromium extension packages directly, but still review the final listing, images, and privacy disclosures in Partner Center.

## Publish To GitHub

1. Create a repository, for example `bilibili-watchlater`.
2. Commit the source files:
   - `manifest.json`
   - `src/`
   - `popup/`
   - `options/`
   - `icons/`
   - `assets/store/`
   - `docs/`
   - `scripts/`
   - `tests/`
   - `README.md`
   - `package.json`
3. Do not commit `dist/` unless you explicitly want release artifacts in the repository.
4. Create a GitHub Release.
5. Attach `bilibili-watchlater-extension.zip` as a release asset.
6. Enable GitHub Pages or another static host for the privacy policy.

## Suggested Versioning

Use semantic versioning:

- `0.1.0`: first private test release.
- `0.2.0`: first public beta release.
- `1.0.0`: stable release after several days of successful automatic sync.

## Post-Release Checks

After publishing or installing the packed extension:

1. Confirm settings persist across browser restarts.
2. Confirm auto sync does not run live unless explicitly allowed.
3. Confirm raw cookie values do not appear in logs or exported settings.
4. Confirm removing the extension clears local extension data.
