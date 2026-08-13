# ImageStitch product and interaction design

## Design premise

ImageStitch is a focused creative workstation: white panels, black tools, and a
neutral-gray stage around the user's artwork. The structure borrows the
confidence and precision of professional image editors while keeping labels,
targets, and presets approachable for frequent non-designers.

The product is inspired by interaction patterns common to Canva, Photoshop,
Figma, and Linear, but uses its own layout, identity, copy, and local-first AI
review model. Color belongs primarily to the work being created, not the app
chrome competing with it.

The one deliberate exception is the ImageStitch mark: a flat, black-framed
stained-glass pane assembled from crisp rainbow facets. It gives the product a
recognizable creative signal while the surrounding workstation stays neutral.

## Audience and tone

Primary users create often but may not identify as designers. The interface is
plain-spoken, calm, and forgiving. It says “bring in an image” instead of
“instantiate bitmap object,” and “quick colors” instead of “fill token
palette.” Advanced capability appears progressively in the inspector.

## Visual system

- **Black:** `#111111` for the tool rail, primary actions, selection, and text.
- **White:** `#ffffff` for the top bar, panels, controls, and default artboard.
- **Soft surface:** `#f6f6f6` for cards, drop zones, and grouped controls.
- **Workspace gray:** `#dedede` for the stage around the artboard.
- **Border gray:** `#d1d1d1` for panel and control separation.
- **Secondary text:** `#686868` for guidance and metadata.
- **Semantic colors only:** green for success, amber for warnings, red for
  errors and destructive actions.

Interface typography uses a clean system sans. Coordinates, dimensions,
revisions, and provenance use mono. User artwork may use any typeface or color;
the interface does not force the monochrome shell onto exported designs.

Controls use six-to-eight-pixel radii, one-pixel borders, and restrained soft
elevation. Hard offset shadows, decorative paper tones, and chromatic active
states are intentionally excluded from application chrome.

## Editor anatomy

1. **Top bar:** identity, project name, undo/redo, AI entry, and export.
2. **Black tool rail:** large icon-and-label targets for editor modes.
3. **White asset panel:** content, presets, and friendly task entry.
4. **Gray stage:** scrollable work area with a high-contrast white artboard.
5. **White inspector:** properties for the current selection only.
6. **Status receipt:** local-save state, revision, export warnings, and AI scope.

The Layers panel supports direct drag ordering and a compact exploded-stack
mode. The 3D view is functional information design: planes are labeled with
their z-index, front-to-back direction remains explicit, and every plane stays
selectable. It does not add ornamental depth to the rest of the interface.

## Interaction rules

- Core actions work with mouse, keyboard, and touch-sized targets.
- Drag interactions always have an inspector or keyboard alternative.
- Double-clicking text opens an in-place editor; the Inspector remains the
  precise alternative for copy and typography.
- Scrolling over the stage zooms around the pointer. Dedicated zoom and Fit
  controls remain available and every icon-only action carries a tooltip.
- Continuous controls may preview live, but one completed gesture creates one
  undo revision.
- Sign-in appears as a focused modal rather than replacing a creative tool
  panel. When the cloud account service is absent, ImageStitch clearly offers a
  browser-bound device profile and leaves cloud/provider actions unavailable.
- Escape exits the current mode; Delete removes selected objects after undo is
  available; arrow keys nudge; Shift modifies constraints consistently.
- Auto-save reports a receipt. It never merely flashes an ambiguous spinner.
- Destructive actions are reversible; irreversible deletion requires explicit
  confirmation and names the affected project or asset.
- AI never changes the canvas invisibly. Proposals show before/after state,
  rationale, affected objects, external data scope, and estimated model cost.
- Reduced-motion mode removes decorative movement without hiding state change.

## Usability acceptance scenarios

- Make a Facebook birthday graphic from three family photos and custom text.
- Remove distractions, adjust color, crop, and export a print-quality portrait.
- Capture a browser page, annotate it, blur private details, and copy the result.
- Resize one approved design into square, story, and landscape variants.
- Ask ChatGPT/Codex for a layout variant, reject one operation, accept the rest,
  then return to the previous revision.
