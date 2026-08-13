# ImageStitch implementation plan

**Status:** Accepted foundation  
**Version:** 0.1  
**Updated:** 2026-08-12

## Product objective

Enable a frequent Canva or PicMonkey user to capture or import an image, create
a polished composition, recover it locally, and export it without an account.
AI should shorten repetitive creative work while leaving every proposed change
visible and reversible.

The first design partner is a high-frequency non-technical creator. That means
the editor must favor recognizable language, generous hit targets, predictable
undo, strong presets, and fast recovery over exposing graphics-engine jargon.

## Release sequence

### Phase 0 — foundation (current)

- Shared Konva web editor packaged into the MV3 extension.
- Upload and visible-page capture paths.
- Text, shape, image, selection, canvas presets, basic color editing, PNG export.
- Local project manifest and first versioned schemas.
- Visual system, architectural boundaries, tests, and public MIT repository.

Exit gate: a clean clone passes `npm run verify`, the unpacked extension opens,
captures a visible tab, and loads that capture into its bundled editor.

### Phase 1 — dependable everyday editor

- IndexedDB asset store and multi-project dashboard.
- Complete undo/redo command history and autosave/recovery receipts.
- Layer panel: reorder, group, rename, duplicate, lock, hide, multi-select.
- Alignment guides, snapping, rulers, zoom, keyboard shortcuts, paste/drop.
- Text typography controls, local font upload, shapes, lines, borders, shadows.
- Crop, rotate, flip, resize, opacity, blend modes, brightness, contrast,
  saturation, temperature, tint, blur, sharpen, vignette, and filters.
- PNG, JPEG, WebP, SVG, project JSON, and print-ready PDF export.

Exit gate: the design partner completes ten representative Canva/PicMonkey jobs
without data loss or needing developer assistance.

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
- Optional encrypted sync, project sharing, comments, and approval links.
- Team roles, brand-kit sharing, revision comparison, and audit events.
- Paid packaging only for durable cloud/team value—not basic editing or access
  to model usage the customer already pays for.

## Near-term backlog

1. Replace localStorage metadata with IndexedDB project and asset repositories.
2. Serialize the complete ImageStitch node model into the project manifest.
3. Add command-based undo/redo and revision snapshots.
4. Build the layer panel and object property inspector.
5. Add crop/adjust/filter mode using Konva filters and pica resize.
6. Add JPEG/WebP/project exports and deterministic import validation.
7. Add extension region selection, image context-menu import, and clipboard copy.
8. Test with five real projects supplied by the design partner.
9. Implement edit-plan validation and a fixture AI review loop.
10. Build the MCP server only after the operation model is stable.

## Verification strategy

- Unit tests for project operations, migrations, plan validation, and storage.
- Schema fixture validation for every committed public example.
- Browser smoke tests at 1440×900, 1280×800, and extension popup dimensions.
- Export pixel checks for preset dimensions, transparency, fonts, and clipping.
- Recovery tests that close/reopen during import, editing, and export.
- Manual usability scripts performed by a non-developer design partner.
- Dependency, font, template, model, and stock-asset license inventory before
  every public release.
