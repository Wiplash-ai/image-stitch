# GlassWare browser-store listing

## Name

GlassWare — Capture and Edit Images

## Short description

Capture visible pages and turn them into editable, local-first artwork in GlassWare.

## Detailed description

GlassWare brings the page already in front of you into a complete image editor.

- Open the full GlassWare editor directly from the toolbar.
- Capture the visible browser page from the explicit “Capture page with GlassWare” context-menu action.
- Edit text, shapes, images, layers, crops, masks, presentation frames, shadows, and region effects.
- Search openly licensed Openverse images and load optional Google Fonts.
- Save projects on this device and export PNG, JPEG, WebP, PDF, or portable GlassWare projects.
- Sign in with Wiplash.ai and use account, cloud-storage, billing, or AI controls inside the packaged editor.

Normal capture, editing, saving, and export do not require an account. Captured website content remains in the browser's local extension storage and the local GlassWare project database unless the user explicitly chooses an online action.

## Category

Productivity

## URLs

- Homepage: https://labs.wiplash.ai/glassware/
- Privacy policy: https://labs.wiplash.ai/glassware/privacy.html
- Support: support@wiplash.ai

## Permission explanations

- `activeTab`: captures only the visible page after the user chooses the GlassWare context-menu command. It does not monitor browsing in the background.
- `contextMenus`: adds the user-invoked “Capture page with GlassWare” command.
- `identity`: opens the browser-owned Wiplash.ai sign-in window and returns only a one-time callback to GlassWare.
- `storage`: holds one pending capture until import, local extension preferences, and—after sign-in—one revocable opaque GlassWare session token. It never stores an identity-provider or ChatGPT token.
- Optional `auth.wiplash.ai`: requested only when the user chooses sign-in so the packaged editor can exchange its one-time PKCE code and use account features.
- `api.openverse.org`: searches and imports user-selected openly licensed images with attribution details.
- `fonts.googleapis.com` and `fonts.gstatic.com`: lets the user browse and load a selected Google Font into an artwork.

## Data-use summary

GlassWare handles captured website content, the source page URL, and user-created artwork locally to provide its disclosed capture-and-edit purpose. It does not sell user data, inject advertising, monitor browsing history, or transmit captures by default. When the user explicitly signs in, the packaged editor contacts the HTTPS GlassWare account service for account, cloud, billing, and AI features described in the linked privacy notice.
