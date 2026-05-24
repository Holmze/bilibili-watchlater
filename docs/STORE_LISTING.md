# Chrome Web Store Listing Draft

## Extension Name

Bilibili Watchlater

## Short Description

Automatically add selected Bilibili UP owners' latest videos to Watch Later.

## Detailed Description

Bilibili Watchlater helps you keep up with selected Bilibili UP owners by adding their latest videos to your own Watch Later list.

Core features:

- Manage a list of Bilibili UP owners.
- Preview candidate videos with dry-run mode.
- Manually sync or run scheduled browser sync.
- Add videos to your Bilibili Watch Later list.
- Avoid duplicate additions with local sync history.
- Show UP owner avatars and profile links for easier management.
- Pause and resume automatic sync from the popup.
- Import and export local extension settings.

The extension runs locally in your browser. It uses your existing Bilibili login state and does not upload your cookies, settings, or sync history to any third-party server.

## Single Purpose Statement

This extension adds selected Bilibili UP owners' latest videos to the user's Bilibili Watch Later list.

## Permission Justifications

### cookies

Used to check whether the user is signed in to Bilibili and to read the Bilibili CSRF token required by Bilibili's Watch Later API. Raw cookie values are not displayed, exported, or sent to the developer.

### storage

Used to store local settings, selected UP owner list, sync history, deduplication state, and failure metadata.

### alarms

Used to schedule browser-based automatic sync.

### tabs

Used to find or open a Bilibili tab so the extension can submit the Watch Later request in a Bilibili page context.

### scripting

Used to execute the Watch Later add request inside a Bilibili page context. This is needed because the Bilibili API may reject direct service worker POST requests.

### Host permission: https://*.bilibili.com/*

Used only for Bilibili login checks, UP owner profile/video lookup, and Watch Later API requests.

## Privacy Practices Summary

- No personal data is sold.
- No data is transferred to the developer.
- Bilibili cookies are used only locally to make Bilibili requests on behalf of the signed-in user.
- Extension settings and sync history are stored locally in the user's browser profile.

## Screenshots To Prepare

Recommended screenshots:

Prepared assets:

- `assets/store/screenshots/01-overview-1280x800.png`
- `assets/store/screenshots/02-owner-management-1280x800.png`
- `assets/store/screenshots/03-popup-results-1280x800.png`
- `assets/store/promo/small-promo-440x280.png`
- `assets/store/promo/large-promo-1400x560.png`
- `assets/store/edge/logo-300x300.png`

Recommended real screenshots to replace or supplement these generated assets:

1. Popup with real dry-run results.
2. Options page showing real UP owner avatars.
3. Options page run mode and sync settings.
4. UP owner page with the `Add to Watchlater Bot` button.

## Store Checklist

- Add a 128x128 icon to the extension package.
- Add at least one store screenshot.
- Add privacy policy URL.
- Complete Chrome Web Store privacy practices.
- Complete Limited Use certification.
- Verify permission justifications match the final manifest.
