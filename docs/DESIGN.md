# ImageStitch product and interaction design

## Design premise

ImageStitch should feel like a well-used creative table: warm paper, dark tools,
bold marks, visible seams, and enough precision to trust the output. The visual
idea is **the stitched workbench**—artboards look like paper being assembled,
while controls feel like compact instruments around it.

This avoids both a generic enterprise dashboard and a direct visual imitation
of Canva or PicMonkey.

## Audience and tone

Primary users create often but may not identify as designers. The interface is
confident, warm, plain-spoken, and forgiving. It should say “bring in an image”
instead of “instantiate bitmap object,” and “quick colors” instead of “fill
token palette.” Advanced capability appears progressively in the inspector.

## Visual system

- **Ink:** `#19352e` for structure, tools, and high-confidence actions.
- **Paper:** `#f8f0df` for the workspace shell.
- **Canvas:** `#fffdf8` or the project's chosen background.
- **Coral thread:** `#db5d3f` for capture, AI proposals, and active tools.
- **Gold pin:** `#e8af45` for highlights and template annotations.
- **Sage:** `#5f826c` for saved, local, and safe states.
- **Blue:** `#4f6da8` for links and informational states.

Display typography uses a characterful editorial serif. Controls use a compact
humanist sans. Coordinates, dimensions, revisions, and provenance use mono.
Production builds should self-host licensed font files rather than rely on a
third-party font request.

## Editor anatomy

1. **Top bar:** identity, project name, undo/redo, AI proposal entry, export.
2. **Tool rail:** one-click modes with large icon and text targets.
3. **Asset panel:** content and presets for the active tool.
4. **Stage:** scrollable neutral cutting mat and the current paper artboard.
5. **Inspector:** properties only for the current selection.
6. **Status receipt:** local-save state, revision, export warnings, and AI scope.

## Interaction rules

- Core actions must work with mouse, keyboard, and touch-sized targets.
- Drag interactions always have an inspector or keyboard alternative.
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
