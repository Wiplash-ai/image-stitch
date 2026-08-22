# GlassWare product and interaction design

## Design premise

GlassWare is a focused creative workstation: white panels, black tools, and a
neutral-gray stage around the user's artwork. The structure borrows the
confidence and precision of professional image editors while keeping labels,
targets, and presets approachable for frequent non-designers.

The product is inspired by interaction patterns common to Canva, Photoshop,
Figma, and Linear, but uses its own layout, identity, copy, and local-first AI
review model. Color belongs primarily to the work being created, not the app
chrome competing with it.

The one deliberate exception is the GlassWare mark: a flat, black-framed
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

The Layers panel uses a compact Photoshop/GIMP-inspired stack. Dragging any
layer row lifts a preview of the full card, and insertion rules show exactly
where it will land. Visibility, lock, duplicate, raise, and lower controls stay
available without changing modes.

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
  panel. When the cloud account service is absent, GlassWare clearly offers a
  browser-bound device profile and leaves cloud/provider actions unavailable.
- Escape exits the current mode; Delete removes selected objects after undo is
  available; arrow keys nudge; Shift modifies constraints consistently.
- Auto-save reports a receipt. It never merely flashes an ambiguous spinner.
- Destructive actions are reversible; irreversible deletion requires explicit
  confirmation and names the affected project or asset.
- AI changes are visible step by step, bounded to six rendered observations and
  three related operations per step, and committed as one named revision with
  dedicated full-session undo and redo.
- Ask AI conversations belong to the current project. Closing and reopening
  restores the latest conversation; History switches conversations and New
  conversation is the only deliberate blank-context action. Signed-in history
  is encrypted in the account service, cached per account on the device, and
  remains individually deletable. Conversations from another project are
  visible but read-only until that project is opened.
- Scroll zooms the artboard. The Hand control, Space-drag, middle-drag, and
  empty-workspace drag pan large artwork without requiring the scrollbars.
- Reduced-motion mode removes decorative movement without hiding state change.

## Usability acceptance scenarios

- Make a Facebook birthday graphic from three family photos and custom text.
- Remove distractions, adjust color, crop, and export a print-quality portrait.
- Capture a browser page, annotate it, blur private details, and copy the result.
- Resize one approved design into square, story, and landscape variants.
- Ask ChatGPT/Codex for a layout variant, watch it inspect and refine the
  rendered artwork, then undo the complete AI session in one action.
