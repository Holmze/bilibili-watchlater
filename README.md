# Bilibili Watchlater

Bilibili Watchlater is a Chrome/Edge extension that adds selected Bilibili UP owners' latest videos to your own Watch Later list.

The extension runs locally in your browser. It uses your existing Bilibili login state, stores settings in `chrome.storage.local`, and does not upload your cookies or sync history to a third-party server.

## Features

- Manage selected Bilibili UP owners.
- Show UP owner avatars, names, and profile links.
- Dry-run mode for previewing candidate videos.
- Manual sync from the popup.
- Browser scheduled sync with `chrome.alarms`.
- Extra safety switch before automatic live sync.
- Deduplicate videos already added successfully.
- Retry transient failures and cool down repeated failures.
- Add UP owners from `space.bilibili.com/{mid}` pages.
- Import and export settings.

## Install Locally

1. Open Chrome or Edge.
2. Visit `chrome://extensions/`.
3. Enable Developer Mode.
4. Click `Load unpacked`.
5. Select this directory:

```text
/Users/chenhanze/Library/CloudStorage/OneDrive-fzu.edu.cn/code/project/bilibili-watchlater-extension-poc
```

## First Run

1. Make sure you are signed in to Bilibili in the same browser profile.
2. Open the extension popup and click `Options`.
3. Add one or more UP owners by `mid`, or open a `space.bilibili.com/{mid}` page and click `Add to Watchlater Bot`.
4. Keep `Dry-run only` enabled.
5. Click `Save`.
6. Return to the popup and click `Sync now`.
7. Confirm the candidate videos look correct.
8. Disable `Dry-run only` only after checking the results.
9. Run one manual live sync.
10. Enable automatic sync after the manual live sync works.

Automatic live sync needs both:

- `Dry-run only` disabled.
- `Allow auto live sync when dry-run is off` enabled.

## Options

- `Dry-run only`: preview candidates without adding videos.
- `Auto sync with browser alarms`: schedule browser-based sync.
- `Allow auto live sync when dry-run is off`: explicit safety switch for automatic live sync.
- `Page size`: number of latest videos fetched for each UP owner.
- `Max age hours`: only process recent videos.
- `Add interval seconds`: delay between live add requests.
- `Fetch retries` / `Add retries`: retry transient failures.
- `Failed cooldown minutes`: pause repeated failures for the same video.

## Data Stored Locally

The extension stores:

- `settings`: selected UP owners and sync preferences.
- `processedVideos`: videos successfully added, used for deduplication.
- `failedVideos`: repeated failures and latest error message.
- `lastSync` / `syncHistory`: recent sync results.
- `lastDiagnostics`: latest diagnostics result.
- `syncLock`: short-lived lock to prevent overlapping sync runs.

Raw Bilibili cookie values are not displayed, exported, or stored by the extension.

## Permissions

- `cookies`: read Bilibili login state and CSRF token.
- `storage`: save local settings and sync state.
- `alarms`: schedule browser sync.
- `tabs`: find or open Bilibili tabs.
- `scripting`: submit the Watch Later request in a Bilibili page context.
- `https://*.bilibili.com/*`: access Bilibili pages and APIs required by the extension.

## Development

Run checks:

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

Prepare a package directory:

```bash
npm run package
```

The output is written to `dist/` and `bilibili-watchlater-extension.zip`.

## Publishing

See:

- [Privacy Policy](docs/PRIVACY.md)
- [Chrome Web Store Listing Draft](docs/STORE_LISTING.md)
- [Publishing Guide](docs/PUBLISHING.md)

Before public release, add final icons and screenshots.

## Limitations

- Automatic sync runs only while the browser can run extension alarms.
- Bilibili web APIs are not official public APIs and may change.
- The extension does not bypass captcha, risk control, or login verification.
