# ImageStitch implementation plan

**Status:** Accepted foundation
**Version:** 0.3
**Updated:** 2026-08-13

## Product objective

Enable a frequent Canva or PicMonkey user to capture or import an image, create
a polished composition, recover it locally, and export it without an account.
AI should shorten repetitive creative work while leaving every proposed change
visible and reversible.

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

### Phase 1 — dependable everyday editor (current milestone)

- [x] IndexedDB project/asset stores and recent-project switching.
- [x] Snapshot undo/redo history and autosave/recovery receipts.
- [x] Layer panel: reorder, rename, duplicate, lock, and hide.
- [ ] Grouping and multi-select.
- [x] Core keyboard shortcuts, paste, and drop.
- [x] Alignment guides, object/artboard snapping, and user-controlled zoom.
- [ ] Rulers and configurable snapping.
- [x] Typeface, size, weight, italic, alignment, line-height, rectangle, and
  ellipse controls.
- [x] Inline canvas text editing, searchable Google Font catalog, and local
  WOFF/WOFF2/TTF/OTF upload with portable font embedding.
- [x] Twelve-shape starter library including polygons, callouts, lines, and arrows.
- [ ] Borders and shadows.
- [x] Non-destructive centered crop presets, opacity, brightness, contrast,
  saturation, blur, grayscale, sepia, and named photo looks.
- [ ] Interactive crop handles, rotate/flip, blend modes, temperature, tint,
  sharpen, and vignette.
- [x] PNG, JPEG, WebP, and portable project bundle export/import.
- [x] Openverse image search with local import and durable attribution receipts.
- [ ] SVG and print-ready PDF export.

Exit gate: the design partner completes ten representative Canva/PicMonkey jobs
without data loss or needing developer assistance.

The scoped milestone, success measures, dependencies, and sequencing are in
[`NEXT_MILESTONE.md`](./NEXT_MILESTONE.md).

### Phase 2 — templates and repeatability

- Social, card, invitation, flyer, banner, label, and print presets.
- Searchable templates with original, clearly licensed ImageStitch content.
- Brand kits for colors, fonts, logos, reusable components, and defaults.
- Multi-page projects, page duplication, resize-with-layout adaptation.
- Background removal adapter and local/manual fallback tools.
- Accessibility checks for contrast, text size, clipping, and export dimensions.

Exit gate: users can create three branded variants from one approved design in
under five minutes.

### Phase 3 — reviewable AI

- [x] Optional account shell and separate ChatGPT/Codex versus OpenAI API
  connection states, backed by a public private-service client contract.
- `imagestitch.edit-plan.v1` validator and selective plan review UI.
- MCP tools for inspecting projects, adding assets, proposing edits, applying
  approved operations, and exporting approved revisions.
- ChatGPT/Codex plugin path using the user's existing authenticated client.
- Server-side encrypted OpenAI API-key connection with immediate revocation.
- AI tasks: layout variants, copy fitting, format adaptation, image generation,
  object replacement, style matching, and accessibility repair.
- Cost and residency preview before any external model receives project data.

Exit gate: stale plans and unknown objects fail closed; no external request is
made without a clear user action and disclosed data scope.

### Phase 4 — optional account and collaboration

- Accountless operation remains the default.
- Production account service, passkey/magic-link sign-in, device linking,
  credential vaulting, revocation, and tenant-scoped audit events.
- Optional encrypted sync, project sharing, comments, and approval links.
- Team roles, brand-kit sharing, revision comparison, and audit events.
- Paid packaging only for durable cloud/team value—not basic editing or access
  to model usage the customer already pays for.

## Near-term backlog

1. Add interactive crop handles, rotate/flip, and resize-quality controls.
2. Add multi-select, grouping, rulers, and configurable snapping.
3. Expand shape families, typography, local fonts, borders, and shadows.
4. Add extension region selection, image context-menu import, and clipboard copy.
5. Add recovery/quota handling and a true project gallery with thumbnails.
6. Add SVG/PDF export and export-dimension pixel assertions.
7. Test with five real projects supplied by the design partner.
8. Implement edit-plan validation and a fixture AI review loop.
9. Build the MCP server only after the operation model is stable.

## Verification strategy

- Unit tests for project operations, migrations, plan validation, and storage.
- Schema fixture validation for every committed public example.
- Browser smoke tests at 1440×900, 1280×800, and extension popup dimensions.
- Export pixel checks for preset dimensions, transparency, fonts, and clipping.
- Recovery tests that close/reopen during import, editing, and export.
- Manual usability scripts performed by a non-developer design partner.
- Dependency, font, template, model, and stock-asset license inventory before
  every public release.
