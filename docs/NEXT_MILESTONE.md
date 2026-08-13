# Next milestone: everyday editing confidence

**Horizon:** next 4–6 weeks

**Primary design partner:** a frequent Canva/PicMonkey creator

**Capacity assumption:** one active implementation stream; no more than two
large initiatives in flight at once.

## Outcome

Enable a frequent creator to complete ten representative everyday graphics in
GlassWare without data loss, developer assistance, or returning to another
editor for a basic layout or photo operation.

## Success measures

- 10/10 representative projects reopen with their layers and edits intact.
- At least 8/10 projects can be completed without developer assistance.
- Every destructive canvas action can be undone in the same session.
- Export dimensions are exact for every supported preset and format.
- A design partner can find grouping, crop, alignment, and export controls on
  the first attempt in at least 80% of scripted tasks.
- The web editor and packaged extension pass browser smoke checks at 1440×900,
  1280×800, and popup dimensions with no console errors.

## Now — milestone scope

### 1. Selection and layout foundation

- Multi-select with Shift-click and drag marquee.
- Group, ungroup, duplicate, lock, hide, reorder, and align/distribute.
- Rulers, configurable snapping, and visible guide controls.
- Keyboard alternatives and named undo receipts for every operation.

Dependency: stabilize the selection command model before AI edit plans can
safely target several objects.

### 2. Complete the photo-editing loop

- Interactive crop handles with aspect lock and reset.
- Rotate, flip, temperature, tint, sharpen, and vignette.
- Before/after preview and quality warning when an export exceeds source detail.

Dependency: normalized crop and adjustment fields already exist; preserve them
as non-destructive project data.

### 3. Real-project recovery and export QA

- Project gallery with thumbnails, rename, duplicate, and storage usage.
- Quota/recovery messaging for interrupted imports and saves.
- SVG and print-ready PDF export with dimension and clipping assertions.
- Ten-project design-partner script and issue log.

Dependency: export QA must land before claiming replacement-level reliability.

## Next — reviewable AI foundation

Once the selection and command model is stable:

- Validate `glassware.edit-plan.v1` fixtures and reject stale revisions,
  unknown objects, or unsupported operations.
- Add a proposal drawer showing rationale, data scope, affected objects, and a
  per-operation accept/reject choice.
- Apply approved operations as one named, reversible revision.
- Build inspect/propose/apply MCP tools against the same command layer.
- Keep provider connections unavailable until production account,
  OAuth, credential vaulting, revocation, and audit boundaries are ready.

## Later

- Templates, brand kits, multipage designs, and resize-with-layout adaptation.
- Production account service, passkeys/magic links, optional encrypted sync,
  sharing, comments, and team roles.
- User-authorized ChatGPT/Codex and server-vaulted OpenAI API connections.
- Background removal, generation, and replacement adapters with explicit cost
  and data-residency receipts.

## Explicitly not in this milestone

- Billing, subscriptions, or monetizing access to model usage users already own.
- Real provider credentials in the browser or extension UI.
- Collaboration, shared team libraries, or public template marketplace.
- Broad generative AI features before selective plan review is safe and useful.

## Prioritization

Scores use `(reach × impact × confidence) / effort` on relative 1–5 inputs.

| Initiative | Reach | Impact | Confidence | Effort | Score |
| --- | ---: | ---: | ---: | ---: | ---: |
| Multi-select and layout commands | 5 | 5 | 5 | 4 | 31.3 |
| Interactive crop and photo controls | 5 | 5 | 4 | 4 | 25.0 |
| Recovery and export QA | 4 | 5 | 5 | 4 | 25.0 |
| Reviewable AI fixture loop | 4 | 5 | 4 | 5 | 16.0 |
| Templates and brand kits | 4 | 4 | 3 | 5 | 9.6 |

The first three initiatives are the committed milestone. Reviewable AI begins
only after the shared selection and command contracts are stable.
