---
name: glassware-create
description: Create or edit portable GlassWare design projects for posters, invitations, social graphics, cards, thumbnails, diagrams, compositions, and other visual requests. Use when an agent needs to turn a visual brief or an existing .glassware.json file into a valid file the user can import into GlassWare.
---

# Create with GlassWare

Produce a polished, editable `.glassware.json` project bundle from the user's visual brief. Preserve existing content and embedded assets when revising a supplied GlassWare file.

## Workflow

1. Read the user's request and inspect any supplied GlassWare file, images, copy, brand constraints, and output dimensions.
2. Fetch and follow the [bundle schema](../../schemas/bundle.v1.schema.json) and [project schema](../../schemas/project.v1.schema.json).
3. Choose a coherent hierarchy, composition, type scale, palette, spacing rhythm, and layer order. Favor a small number of strong design decisions over decorative clutter.
4. Create or update a `glassware.bundle.v1` JSON bundle.
5. Validate the final JSON against both schemas and check every object remains inside or intentionally intersects the artboard.
6. Save the result as `<descriptive-name>.glassware.json` and tell the user to open it from GlassWare's Files panel.

## Bundle contract

Always return a portable bundle with this top-level shape:

```json
{
  "schemaVersion": "glassware.bundle.v1",
  "exportedAt": "<ISO 8601 timestamp>",
  "project": { "schemaVersion": "glassware.project.v1" },
  "assets": [],
  "fonts": []
}
```

Use valid UUIDs for project, revision, object, and asset identifiers. Set `residency` to `local`. Keep `currentRevisionId` equal to the newest revision ID.

For a new project, include one revision whose snapshot exactly matches the project's current `canvas` and `objects`. For an edit, retain valid history, append one revision describing the change, and cap the list at 100 revisions.

Use the canvas preset matching the request:

- `square`: 1080 x 1080
- `portrait`: 1080 x 1350
- `story`: 1080 x 1920
- `landscape`: 1200 x 628
- `custom`: user-specified dimensions

## Editable elements

Use text nodes for copy and shape nodes for vector composition. Keep dimensions and coordinates in canvas pixels.

Supported shapes are `rect`, `rounded-rect`, `ellipse`, `triangle`, `diamond`, `pentagon`, `hexagon`, `star`, `heart`, `speech-bubble`, `line`, and `arrow`.

Use common installed fonts unless embedding an authorized font in `fonts`. Give every layer a descriptive `name`. Set `visible: true`, `locked: false`, `scaleX: 1`, `scaleY: 1`, and `opacity: 1` unless the design calls for a different value.

For images, include an image node and a matching embedded asset with a supported `data:image/...;base64,` URL. Preserve attribution for Openverse assets. Do not reference a local path or remote URL from an image node.

## Editing an existing project

- Preserve unknown-but-valid user content, embedded assets, font data, attribution, project compatibility, and object IDs unless replacement is required.
- Update both current project state and the newest revision snapshot.
- Keep image edits non-destructive through crop and adjustment fields.
- Never remove attribution or silently replace user assets.

## Quality and safety checks

- Keep body text readable and visual contrast deliberate.
- Avoid clipping important copy, accidental overlap, microscopic text, and unsupported shape or font values.
- Use only user-provided, generated, public-domain, or appropriately licensed imagery and fonts.
- Do not place credentials, private URLs, account data, or model-provider secrets in the bundle.
- Do not claim the design was rendered when only the JSON was generated. If rendering is unavailable, say so and provide the importable file.
