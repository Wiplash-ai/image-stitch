# GlassWare

GlassWare is a local-first creative workbench from Wiplash Labs for making
social graphics, cards, flyers, banners, print pieces, and polished photo edits.
It combines a manual canvas editor with a reversible autonomous AI design loop and a useful
browser extension for capturing the page already in front of you.

The goal is a friendly, capable alternative to the everyday Canva and PicMonkey
workflow—not a thin AI wrapper. GlassWare remains useful without an account,
an upload, or an AI connection.

## Current status

Version 1.0 browser-store release candidate with a dependable local editing
slice:

- Konva canvas with selectable, movable, resizable text, shapes, and images.
- Separate Text, Shapes, Images, and Canvas panels built around their actual
  tasks rather than one generic starter panel.
- Fifteen editable shape primitives—including arrows, callouts, visual blur,
  and privacy-safe redaction—and heading, subheading, and body-text presets.
- Unrestricted color-wheel and hex controls with shortcut palettes for
  artboards, text, and shape fills, with one-step undo for committed colors.
- Local upload, paste, drag/drop, browser-extension capture, and openly
  licensed image search through Openverse.
- Durable creator, source, license, and attribution receipts for searched image
  assets, included in portable project bundles.
- Square, portrait, story, and landscape presets.
- Photoshop/GIMP-inspired layer stack with full-card drag ordering, Shift and
  marquee multi-select, groups, alignment/distribution, blend modes, global
  visibility/lock controls, duplicate, create, delete, rename, and object
  inspector controls.
- Snapshot undo/redo, keyboard nudging/shortcuts, and visible autosave receipts.
- Multi-page IndexedDB projects with independent page undo/redo, page
  duplicate/reorder/rename/delete, original image blobs, components, and reload
  recovery.
- Rulers, movable numeric guides, artboard/object snapping, and grab-to-pan
  canvas navigation.
- Non-destructive crop presets plus a draggable precision crop, rotate/flip,
  editable hide/restore masks, photo presets, brightness, contrast, saturation,
  temperature, tint, sharpen, vignette, blur, grayscale, and sepia adjustments.
- A dedicated Studio panel with explicit **Selected image** and **Whole artwork**
  targets, Screenshot Studio-inspired one-click looks, corner presets,
  macOS/Windows/Arc/glass/border/photo frames, adjustable two-axis shadows,
  artwork spacing, and solid, gradient, or uploaded-image backdrops with
  opacity, blur, and texture controls. These edits survive local save,
  undo/redo, portable export, and full-size image export without flattening the
  editable design.
- One **Shapes & markup** library: editable geometry plus straight and curved
  arrows, highlights, lines, true region blur, and secure opaque redaction.
  Selecting an existing layer first places blur or redaction directly over it.
  Selected images can be replaced while preserving their crop, size, position,
  frame, and adjustments.
- A reusable **Try Studio Playground** action in Files creates a local sample
  screenshot project and opens it directly in Studio for hands-on testing.
- Inline canvas text editing plus a searchable typeface picker, 22 curated
  open-source Google Fonts, local font-file upload, standard alignment icons,
  and precise size, style, line-height, snapping, and pointer-centered wheel
  zoom controls.
- PNG, JPEG, WebP, appearance-preserving SVG, and one-page or all-pages PDF
  export with 0.5×–4× sizing, transparency, quality/DPI controls, and clipping,
  source-detail, transparency, and print-color preflight. Portable project
  import/export includes original assets, used fonts, pages, revisions, and
  reusable components.
- Four original, asset-free editable templates; device-local brand color/font
  kits; and project-scoped reusable components.
- Public project, portable bundle, and AI edit-plan schemas.
- A single Wiplash.ai account entry with a secure cookie/CSRF client contract
  for the private account service. The shared realm offers Google, GitHub, and
  GitLab and reuses an existing Wiplash session. Local editing remains
  account-free, and provider connections never pretend to succeed when that
  service is unavailable.
- Opt-in encrypted cloud project sync stores complete portable project archives
  by account—including pages, revision history, image assets, used font files,
  components, and gallery thumbnails—with bounded quotas, conflict-copy
  recovery, explicit deletion, and local editing while offline. Provider
  credentials and AI execution handles are rejected from project archives.
- Creator, Designer, and Director billing is wired through Stripe-hosted
  Checkout and the customer portal. The account service owns the Price IDs,
  verifies raw-body webhook signatures, grants 100 GB or unlimited cloud
  entitlements, and enforces the three-failure/30-day recovery policy without
  exposing Stripe secrets or identifiers to the editor.
- Separate ChatGPT/Codex subscription and OpenAI API connection states, with a
  private container runner, encrypted credentials, and opaque browser receipts.
- A dedicated three-tab AI settings modal for ChatGPT, API-key, or external-agent
  skill workflows, plus explicit GPT-5.6 model and reasoning controls.
- A draggable, minimizable Ask AI workspace that accepts image, SVG, Markdown,
  text, JSON, and CSV references. Project-scoped conversations are cached in
  IndexedDB, encrypted in an account-owned cloud archive, restored across
  devices, and available through a history drawer with an explicit **New
  conversation** action. Other-project history is read-only until that project
  is opened. A resumable Codex thread
  continues across user messages and makes up to six
  focused visual steps of no more than three related operations, renders after
  each step, returns the result to Luna for critique, and commits the finished
  session as one dedicated AI revision with **Undo AI edits** and **Redo AI
  edits** controls.
  Its capability contract covers layer removal/reordering/visibility/locks,
  grouping, alignment/distribution, guides/snapping, blend modes, transforms,
  every GlassWare shape, attached or reusable Openverse images, the complete
  non-destructive photo/crop/mask and Studio toolsets, pages/templates,
  components/brand kits, and safe export preflight. An audited runner-owned
  design skill teaches the model the exact project, layout, image, Studio,
  reusable-resource, and review semantics. Multi-page AI sessions remain one
  atomic undoable/redoable transaction.
- AI runs are revision-bound and cancellable. GlassWare keeps per-pass draft,
  operation, quality, and token-usage receipts in IndexedDB, retries temporary
  polling failures against the same runner job, discards interrupted drafts on
  reload, and refuses to commit if the project revision changed. Deterministic
  checks for clipping, source resolution, contrast, safe zones, and explicit
  request requirements feed failures back into the next visual pass.
- Grab-to-pan navigation with a Hand control, Space-drag, middle-drag, and
  direct dragging on the empty canvas workspace; scroll remains zoom.
- API-key connections can fulfill an agent-requested raster generation through
  GPT Image 2. ChatGPT-connected Codex sessions can use Codex's supported
  built-in image-generation path without pretending that subscription access is
  direct API credit. Both paths validate the artifact and show an explicit
  generated-image receipt.
- Manifest V3 extension with visible-page capture and a packaged copy of the
  same local editor.
- The production editor uses an audited Konva subset and lazy-loads Studio, AI
  settings, AI chat, and the AI command planner. Initial JavaScript is 586.2 kB
  (179.2 kB gzip), down from the 1,103.0 kB (380.0 kB gzip) baseline; no
  production chunk exceeds Vite's 500 kB warning threshold.

## Product boundary

- **Public here:** editor UI, browser extension, local project model, schemas,
  API clients, MCP contracts, public skills, and sanitized examples.
- **Optional private services:** user authentication, encrypted BYOK vault,
  synchronization, managed agent sandboxes, operational automation, and billing.
- A ChatGPT subscription connects to a private Codex CLI workspace through the
  official one-time device authorization flow; it is not treated as API credit
  or converted into an API key.
- A user-supplied OpenAI API key crosses the explicit connection form once over
  HTTPS, is verified and encrypted server-side, and is never persisted in
  browser storage, extension storage, project files, URLs, or response bodies.
- The public [`glassware-create` skill](public/skills/glassware-create/SKILL.md)
  lets another capable agent produce schema-valid, portable GlassWare projects
  without receiving a GlassWare account or provider credential.

## Development

```bash
npm install
npm run dev
```

Verify the model, schemas, storage, browser interactions, exports, and packaged
extension:

```bash
npm run verify
```

The unpacked extension is generated at
`artifacts/glassware-extension`. A deterministic, source-map-free Chromium
store ZIP, checksum, and release receipt are generated under
`artifacts/store/chromium`. Load the unpacked directory from
`chrome://extensions` with Developer mode enabled; upload the ZIP itself to the
Chrome or Edge submission dashboard.

The toolbar opens the packaged editor directly; visible-page capture is an
explicit page context-menu action. Editing, local persistence, account UI,
cloud controls, AI chat, and export remain in that editor tab. Extension
sign-in uses Chromium's browser-owned identity window with S256 PKCE and stores
only a revocable GlassWare session token. Wiplash/Keycloak and provider tokens
never enter extension storage.

## Plans and decisions

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Product and interaction design](docs/DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Account and AI connection contract](docs/ACCOUNT_AND_AI_CONNECTIONS.md)
- [Open image search and attribution](docs/IMAGE_SEARCH.md)
- [Screenshot Studio feature integration](docs/SCREENSHOT_STUDIO_INTEGRATION.md)
- [Pricing benchmark and billing policy](docs/PRICING_RESEARCH.md)
- [Chromium store release checklist](docs/STORE_RELEASE.md)
- [Open-source foundation](docs/OPEN_SOURCE_FOUNDATION.md)

## License

MIT. Third-party packages and future content assets retain their own licenses;
the dependency and asset license audit is a release gate.
