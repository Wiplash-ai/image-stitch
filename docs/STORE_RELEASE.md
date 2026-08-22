# Chromium store release

GlassWare 1.0 is packaged as a Chromium Manifest V3 extension for the Chrome
Web Store and Microsoft Edge Add-ons. This document is the reproducible release
and manual-review checklist; it does not authorize a store upload.

## Build and verify

Use Node.js 20 or newer from a clean checkout:

```bash
npm ci
npm run verify
npm run smoke:extension
```

`npm run verify` runs unit tests, the production web build, extension packaging,
and static package validation. `npm run smoke:extension` additionally launches
an isolated local Chromium profile and therefore runs separately from CI.

Release outputs:

- `artifacts/glassware-extension/` — unpacked package for local testing.
- `artifacts/store/chromium/glassware-1.0.0-chromium.zip` — store upload.
- `artifacts/store/chromium/glassware-1.0.0-chromium.zip.sha256` — checksum.
- `artifacts/store/chromium/release.json` — version, size, file count, and hash.

Do not rebuild between final approval and upload. Upload the exact reviewed ZIP
and compare its SHA-256 digest with the release receipt.

## Manual BrowserOS checklist

1. Confirm GlassWare is enabled at `chrome://extensions` and version is 1.0.0.
2. Open an ordinary HTTPS page and click the GlassWare toolbar icon.
3. Click **Capture visible page** and confirm the packaged editor opens once
   with the screenshot selected.
4. Save, rename, reload, and reopen the project from **Files**.
5. Export PNG and a portable GlassWare bundle; re-import the bundle.
6. Right-click a normal page image, choose **Send image to GlassWare**, and
   confirm the source receipt appears in the imported image details.
7. Click **Ask AI** and **Sign in** from the extension editor. Confirm each opens
   `https://labs.wiplash.ai/glassware/app.html` and does not request credentials
   inside the extension origin.
8. Inspect the extension service worker console and editor console for errors.

## Store materials

Listing copy, permission justifications, privacy disclosures, reviewer notes,
screenshots, and promotional artwork live in [`../store-assets`](../store-assets).
Review those files against the final package before each store submission.

Chrome and Edge submissions are separate live-state operations. After upload,
record the dashboard status and review any store-generated warnings before
claiming that GlassWare is published.
