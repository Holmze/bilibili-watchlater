# Privacy Policy

## Bilibili Watchlater

Bilibili Watchlater is a browser extension that helps users add selected Bilibili UP owners' latest videos to the user's own Bilibili Watch Later list.

## Data Collected

The extension stores the following data locally in the browser:

- Extension settings, including selected UP owner IDs, names, avatar URLs, and sync preferences.
- Sync history, including video IDs, video titles, sync result status, and timestamps.
- Deduplication state for videos that have already been added successfully.
- Failed sync metadata, including failure count and latest error message.

The extension does not collect, transmit, sell, or share this data with the developer or any third party.

## Account Credentials And Cookies

The extension reads Bilibili cookies only inside the user's browser to check login state and submit requests to Bilibili APIs on behalf of the signed-in user.

The extension does not display, export, upload, or store raw cookie values such as `SESSDATA` or `bili_jct`.

## Network Requests

The extension sends requests only to Bilibili domains required for its single purpose:

- Checking Bilibili login state.
- Reading selected UP owner profiles and latest videos.
- Adding selected videos to Watch Later.

## Data Storage

All extension data is stored with `chrome.storage.local` in the user's browser profile.

Users can remove this data by removing the extension or clearing extension site data from the browser.

## Permissions

- `cookies`: read Bilibili login state and CSRF token.
- `storage`: store local settings and sync state.
- `alarms`: run scheduled browser sync.
- `tabs` and `scripting`: execute the Watch Later add request in a Bilibili page context.
- `https://*.bilibili.com/*`: access Bilibili APIs and Bilibili pages.

## Contact

For privacy questions, open an issue in the project repository.
