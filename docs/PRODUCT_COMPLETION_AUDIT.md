# Product completion audit

GlassWare already covers local composition, editable text and shapes, photo
adjustments, Studio presentation, open-image search, portable bundles,
account-backed AI connections, an iterative visual agent, AI undo/redo,
encrypted cross-device conversation history, and complete project archives.
“Complete” should mean a
frequent Canva/PicMonkey creator can finish representative work reliably, not
that every mature Photoshop feature has been copied.

## Completed: replacement-level editor foundation

1. **Selection and layout:** Shift/marquee multi-select, persistent groups,
   align/distribute, blend modes, rulers, numeric guides, configurable snapping,
   and global layer visibility/lock controls.
2. **Precise photo editing:** draggable and resizable crop, rotate/flip,
   temperature/tint/sharpen/vignette, and editable hide/restore masks with
   feather, inversion, per-stroke undo, and non-destructive persistence.
3. **Cloud project recovery:** opt-in, account-isolated encrypted archives for
   manifests, all pages, revisions, original assets, used fonts, components,
   and thumbnails; bounded quotas, explicit deletion, cloud gallery restore,
   and conflict copies while local editing remains available offline.
4. **Export confidence:** PNG/JPG/WebP/SVG/PDF, transparent export,
   quality/DPI/dimension controls, all-pages PDF, and preflight for clipping,
   insufficient source detail, transparency, raster SVG content, and browser
   sRGB print output.
5. **Repeatable designs:** four original editable templates, multi-page
   projects with independent history, device-local brand kits, and project
   components included in portable and cloud archives.

## Next: deeper manual editor workflows

1. **Vector and drawing tools:** pressure-aware brush, pen/Bezier paths,
   editable strokes, compound paths, text on path, gradients, and reusable
   style presets.
2. **Deeper layer model:** clipping masks, adjustment layers, editable filter
   stacks, linked/embedded assets, and richer group transforms.
3. **Responsive variants:** resize-with-layout adaptation, linked square/story/
   landscape variants, batch raster export, and comparison/promotion flows.
4. **Expanded brand system:** logos, imagery, guidelines, defaults, shared team
   kits, and opt-in cloud sync. Brand kits are intentionally device-local today.
5. **Background and object work:** subject selection, one-click background
   removal, erase/restore refinement, object removal, inpainting, outpainting,
   and upscaling.

## Later: cloud collaboration

- Share links, comments, approvals, roles, team libraries, activity history,
  revision comparison, and presence/co-editing.
- A licensed template/element library and extension capture improvements.
- Billing only around hosted storage, collaboration, managed automation, and
  operational value—not a surcharge on a user's connected model access.

## AI editor-agent gaps

### Completed in the AI parity milestone

1. **Tool parity with the editor:** strict project-first commands now cover multi-select,
   grouping, align/distribute, guides/snapping, precise crop, masks, blend
   modes, templates, pages, brand kits, components, and export/preflight. The
   agent receives compact page/resource context and safe export receipts, and a
   multi-page run commits as one persistent AI undo/redo transaction.
2. **Safer iterative runs:** exact base-revision guards, account-scoped cancel,
   durable local per-pass receipts, bounded reconnect against the same job,
   token-usage receipts, interrupted-run cleanup, and one final atomic AI
   revision. Deterministic QA covers clipping, source resolution, contrast,
   safe zones, alignment-related request checks, and explicit request
   satisfaction, with blocking failures returned to the next model pass.

### Now

1. **Region-aware raster editing:** let the agent create/refine a mask and call
   image editing for inpainting, object removal/replacement, background work,
   and outpainting—not only generate a whole raster and place it as a layer.
2. **QA depth and accounting:** add locale-aware spelling only after a creator
   can choose the language and allowlist brand terms. Add dollar estimates only
   where a provider exposes a stable billable model ID and price; ChatGPT
   subscription turns continue to show actual token usage without inventing a
   per-request cost.

### Next

1. **Semantic design graph:** OCR, text-box reconstruction, font matching,
   subject/object segmentation, reading order, role labels, and stable natural
   references such as “the product photo” or “the second price card.”
2. **Editable-design reconstruction:** turn a flat design or generated image
   into editable text/image/graphic layers, comparable to Canva Magic Layers.
3. **Brand and preference memory:** opt-in brand kits, approved examples, tone,
   accessibility rules, and per-project design decisions with visible controls
   to inspect, edit, and forget memory.
4. **Variants and batch adaptation:** create multiple editable directions,
   preserve intentional differences, resize across formats, and compare or
   promote a candidate without losing the original.
5. **Asset intelligence:** search only licensed sources, rank the user's own
   assets/templates first, preserve provenance, and warn when generated or
   retrieved content may be unsuitable for commercial use.

## Evidence used for this audit

- [Canva Brand Kit](https://www.canva.com/pro/brand-kit/)
- [Canva Background Remover](https://www.canva.com/features/background-remover/)
- [Canva AI assistant](https://www.canva.com/ai-assistant/)
- [Canva Magic Layers](https://www.canva.com/magic-layers/)
- [Photoshop Smart Objects](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/smart-objects-overview-and-benefits.html)
- [Photoshop adjustment layers](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/adjustment-layers-options.html)
- [Photoshop layer masks](https://helpx.adobe.com/photoshop/desktop/create-masks/layer-masks/add-layer-masks.html)
- [GIMP 3 paths](https://docs.gimp.org/3.0/en/gimp-using-paths-properties.html)
- [GIMP 3 filter behavior](https://docs.gimp.org/3.0/en/gimp-filters-common.html)
- [OpenAI image generation and editing](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI strict function calling](https://developers.openai.com/api/docs/guides/function-calling)
- [OpenAI background mode and cancellation](https://developers.openai.com/api/docs/guides/background)
