# GlassWare implementation plan

**Status:** 1.0 browser-store release candidate
**Version:** 1.0
**Updated:** 2026-08-22

## Product objective

Enable a frequent Canva or PicMonkey user to capture or import an image, create
a polished composition, recover it locally, and export it without an account.
AI should shorten repetitive creative work by editing, rendering, inspecting,
and refining an in-memory draft while leaving the completed session reversible.

The first design partner is a high-frequency non-technical creator. That means
the editor must favor recognizable language, generous hit targets, predictable
undo, strong presets, and fast recovery over exposing graphics-engine jargon.

## Release sequence

### Phase 0 — foundation (complete)

- Shared Konva web editor packaged into the MV3 extension.
- Upload and visible-page capture paths.
- Text, shape, image, selection, canvas presets, basic color editing, PNG export.
- Local project manifest and first versioned schemas.
- Visual system, architectural boundaries, tests, and public MIT repository.

Exit gate: a clean clone passes `npm run verify`, the unpacked extension opens,
captures a visible tab, and loads that capture into its bundled editor.

### Phase 1 — dependable everyday editor (complete foundation)

- [x] IndexedDB project/asset stores and recent-project switching.
- [x] Snapshot undo/redo history and autosave/recovery receipts.
- [x] Layer panel: full-card drag reorder, rename, duplicate, lock, and hide.
- [x] Shift/marquee multi-select, grouping, ungrouping, alignment, and
  distribution with selection/artboard references.
- [x] Core keyboard shortcuts, paste, and drop.
- [x] Alignment guides, object/artboard snapping, and user-controlled zoom.
- [x] Rulers, editable guides, object/artboard/guide snapping, and grab-to-pan
  navigation.
- [x] Typeface, size, weight, italic, alignment, line-height, rectangle, and
  ellipse controls.
- [x] Inline canvas text editing, searchable Google Font catalog, and local
  WOFF/WOFF2/TTF/OTF upload with portable font embedding.
- [x] Fifteen-shape starter library including polygons, callouts, straight and
  curved arrows, visual blur, and privacy-safe redaction.
- [x] Screenshot Studio-inspired presentation looks for a selected image or the
  whole artwork, including corner radius, browser/device/photo frames,
  adjustable two-axis shadows, artwork spacing, and solid, gradient, or image
  backdrops stored as non-destructive project data.
- [x] Screenshot annotation palette and selected-image source replacement that
  preserve editable layers and existing presentation settings.
- [x] Non-destructive centered crop presets, opacity, brightness, contrast,
  saturation, blur, grayscale, sepia, and named photo looks.
- [x] Interactive crop handles, rotate/flip, blend modes, temperature, tint,
  sharpen, vignette, and editable feathered hide/restore image masks.
- [x] PNG, JPEG, WebP, SVG, one-page/all-pages PDF, and portable project bundle
  export/import with size, transparency, quality/DPI, and preflight controls.
- [x] Openverse image search with local import and durable attribution receipts.
- [x] Atomic project rendering so undo/page changes cannot expose or serialize a
  partially loaded image stack.

Exit gate: the design partner completes ten representative Canva/PicMonkey jobs
without data loss or needing developer assistance.

The scoped milestone, success measures, dependencies, and sequencing are in
[`NEXT_MILESTONE.md`](./NEXT_MILESTONE.md).

### Phase 2 — templates and repeatability

- [x] Four original, editable, asset-free templates spanning social, card,
  announcement, story, and banner layouts.
- [x] Device-local brand color/font kits and project-scoped reusable components
  included in portable and cloud archives.
- [x] Multi-page projects with duplicate/reorder/rename/delete, independent
  page history, and all-pages PDF.
- [ ] Expanded template families, logo/imagery brand assets, and defaults.
- [ ] Responsive resize-with-layout adaptation and linked format variants.
- Background removal adapter and local/manual fallback tools.
- Accessibility checks for contrast, text size, clipping, and export dimensions.

Exit gate: users can create three branded variants from one approved design in
under five minutes.

### Phase 3 — autonomous visual AI (current)

- [x] Modal account entry, honest device-profile fallback, and separate
  ChatGPT/Codex versus OpenAI API connection states backed by a public
  private-service client contract.
- [x] Shared Wiplash SSO plus server-side encrypted ChatGPT/Codex and OpenAI API
  connection storage with immediate revocation.
- [x] A resumable six-step maximum edit, render, inspect, and refine loop using
  a clean artboard preview as feedback for each subsequent Codex turn, with no
  more than three related operations per step.
- [x] Project-scoped AI conversation history with account-owned encrypted cloud
  sync, per-account IndexedDB caching, cross-device restoration and deletion,
  explicit new-chat navigation, and Codex context resumption across messages
  with bounded transcript recovery after a runner-session timeout.
- [x] Image and document attachments with MIME, count, and decoded-size limits.
- [x] One named project revision per completed AI session and dedicated
  one-click AI undo/redo that remains available after later manual revisions.
- [x] API-key and ChatGPT-connected Codex image-generation adapters for
  schema-requested raster assets.
- [x] Existing editor operation contract for removal/reordering, visibility and
  locks, photo adjustments/crops, reusable Openverse image search, selected
  image presentation, real text/shape shadows, and whole-artwork Studio styling,
  backed by an audited runner-owned visual-design skill.
- [x] Grab-to-pan canvas navigation through a Hand mode, Space-drag,
  middle-drag, or direct empty-workspace dragging.
- [x] Tool parity for grouping, alignment/distribution, guides, precise crop,
  masks, blend modes, templates, pages, brand kits, components, and export QA.
- [ ] MCP tools for inspecting projects, adding assets, proposing edits, applying
  approved operations, and exporting approved revisions.
- AI tasks: layout variants, copy fitting, format adaptation, image generation,
  object replacement, style matching, and accessibility repair.
- Durable cancellation, run receipts, cost visibility, retention controls, and
  residency preview before any external model receives project data.

Exit gate: stale drafts and unknown operations fail closed; interrupted runs
leave the original revision intact; no external request is made without a clear
user action and disclosed data scope.

### Phase 4 — optional account and collaboration

- Accountless operation remains the default.
- Production hardening for the OAuth account service, extension device linking,
  credential vaulting, revocation, and tenant-scoped audit events.
- [x] Optional encrypted account-isolated project sync for complete portable
  archives, original assets, used fonts, components, revisions, and thumbnails.
- [ ] Sharing, comments, approval links, and cloud/team brand kits.
- Team roles, brand-kit sharing, revision comparison, and audit events.
- Paid packaging only for durable cloud/team value—not basic editing or access
  to model usage the customer already pays for.

### Phase 5 — browser distribution (current)

- [x] Harden the Chromium MV3 manifest to the minimum runtime permissions and
  document every host permission.
- [x] Add production raster icons, deterministic source-map-free ZIP packaging,
  a checksum receipt, and release-package verification.
- [x] Keep capture, local editing, persistence, account UI, AI chat, and export
  inside the packaged extension, backed by the same constrained HTTPS services
  as the web app.
- [x] Prepare Chrome/Edge listing copy, privacy disclosures, reviewer notes,
  screenshots, and promotional images from the actual packaged editor.
- [x] Add isolated Chromium smoke coverage for packaged capture import, local
  recovery, and PNG export, plus pull-request CI.
- [x] Install the unpacked 1.0 package in BrowserOS without replacing the
  existing profile or its other extensions.
- [ ] Complete the manual toolbar-open and context-menu capture checklist, merge the
  release pull request, tag the approved build, and submit it to each store.

Exit gate: a human can open the editor from the toolbar, capture a real page
from the context menu, edit and recover the project, export the result, and
confirm the store listing accurately describes every permission and network
boundary.

## Near-term backlog

1. Complete the Chromium store-release checklist and submit the approved 1.0
   package to Chrome Web Store, then Microsoft Edge Add-ons.
2. Test ten real projects supplied by the design partner and log recovery,
   discoverability, and output-quality failures.
3. Add extension region selection, image context-menu import, and clipboard copy.
4. Add vector brush/pen paths, adjustment layers, and responsive variants.
5. Build the MCP server only after the shared command model is stable.

## Verification strategy

- Unit tests for project operations, migrations, plan validation, and storage.
- Schema fixture validation for every committed public example.
- Browser smoke tests at 1440×900 and 1280×800, plus the packaged extension tab.
- Export pixel checks for preset dimensions, transparency, fonts, and clipping.
- Recovery tests that close/reopen during import, editing, and export.
- Manual usability scripts performed by a non-developer design partner.
- Dependency, font, template, model, and stock-asset license inventory before
  every public release.
