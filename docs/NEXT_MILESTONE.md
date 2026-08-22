# Next milestone: browser-store release and distribution

**Horizon:** release candidate through first public store approval

**Primary design partner:** a frequent Canva/PicMonkey creator

**Release target:** Chromium Manifest V3 for Chrome Web Store and Microsoft
Edge Add-ons. Firefox is a separate compatibility and consent review.

## Outcome

Ship the real GlassWare editor as a small, trustworthy browser extension. A
user can open the packaged editor directly, capture the visible page from an
explicit context-menu command, recover the project after a restart, and export
it without an account. Optional account, cloud, billing, and AI workflows stay
inside the packaged editor and use the constrained HTTPS GlassWare service.

## Release foundation completed

- Reviewed MV3 permissions: `activeTab`, `contextMenus`, `identity`, and
  `storage`, with optional `auth.wiplash.ai` access requested at sign-in.
- Narrow host permissions for Openverse image search and Google Fonts only.
- 16, 32, 48, and 128 pixel production icons and an explicit extension CSP.
- Deterministic source-map-free Chromium ZIP, SHA-256 checksum, and machine-
  readable release receipt.
- Package verification for version consistency, file layout, icons, permission
  allowlists, remote scripts, source maps, checksum, and size.
- Store listing copy, privacy disclosures, reviewer notes, five screenshots,
  and Chrome-sized promotional images generated from the actual editor.
- Pull-request CI for tests, production build, package generation, and release
  validation.
- Isolated Chromium smoke coverage for packaged pending-capture import, local
  project persistence, reload recovery, and PNG export.
- BrowserOS installation alongside the user's existing extensions and restored
  tabs, plus native extension account/AI verification.

## Final release gates

1. Confirm the BrowserOS toolbar icon opens or focuses the full editor directly.
2. Manually capture a normal HTTPS page from **Capture page with GlassWare** in
   the context menu.
3. Edit the captured project, reload it, and export PNG and portable bundle files.
4. Review every screenshot, listing claim, privacy disclosure, and support URL
   as a user and as a store reviewer.
5. Merge the release pull request only after CI and the manual checklist pass.
6. Tag the exact approved commit as `v1.0.0` and preserve its ZIP checksum.
7. Submit that unchanged ZIP to Chrome Web Store, verify dashboard status, then
   repeat the live listing audit for Microsoft Edge Add-ons.

Store upload and publication remain explicit external actions. Packaging and
local installation do not submit or publish GlassWare.

## Acceptance criteria

- The toolbar opens one bundled editor tab and focuses it on later clicks.
- A context-menu page capture arrives once and never reads other tabs without a
  direct user action.
- A locally saved project survives BrowserOS and machine restarts.
- PNG export has the requested dimensions and a valid PNG signature.
- No provider credential, session cookie, artwork asset, or AI conversation is
  written to extension storage or included in the store ZIP.
- Account and AI controls stay in the packaged editor; sign-in uses a
  browser-owned PKCE window and only an opaque GlassWare session is stored.
- The submitted listing describes all data use and permissions without broader
  claims than the package implements.

## Immediately after approval

- Add lightweight, privacy-preserving install and capture-success diagnostics
  only if they can remain optional and credential-free.
- Triage real creator feedback before adding region capture, clipboard export,
  or Firefox-specific packaging.
- Resume responsive variants, brush/pen paths, adjustment layers, team sharing,
  and broader AI parity based on observed usage rather than release pressure.
