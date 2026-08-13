# ImageStitch

ImageStitch is a local-first creative workbench from Wiplash Labs for making
social graphics, cards, flyers, banners, print pieces, and polished photo edits.
It combines a manual canvas editor with reviewable AI edit plans and a useful
browser extension for capturing the page already in front of you.

The goal is a friendly, capable alternative to the everyday Canva and PicMonkey
workflow—not a thin AI wrapper. ImageStitch remains useful without an account,
an upload, or an AI connection.

## Current status

Pre-alpha with a dependable local editing slice:

- Konva canvas with selectable, movable, resizable text, shapes, and images.
- Separate Text, Shapes, Images, and Canvas panels built around their actual
  tasks rather than one generic starter panel.
- Twelve editable shape primitives and heading, subheading, and body-text
  presets.
- Unrestricted color-wheel and hex controls with shortcut palettes for
  artboards, text, and shape fills, with one-step undo for committed colors.
- Local upload, paste, drag/drop, browser-extension capture, and openly
  licensed image search through Openverse.
- Durable creator, source, license, and attribution receipts for searched image
  assets, included in portable project bundles.
- Square, portrait, story, and landscape presets.
- Photoshop/GIMP-inspired layer stack with drag-and-drop ordering, an exploded
  3D z-index view, visibility, lock, duplicate, create, delete, rename, and
  object inspector controls.
- Snapshot undo/redo, keyboard nudging/shortcuts, and visible autosave receipts.
- IndexedDB projects and original image blobs with reload recovery.
- Non-destructive centered crops, photo presets, brightness, contrast,
  saturation, blur, grayscale, and sepia adjustments.
- Inline canvas text editing plus a searchable typeface picker, 22 curated
  open-source Google Fonts, local font-file upload, standard alignment icons,
  and precise size, style, line-height, snapping, and pointer-centered wheel
  zoom controls.
- Full-size PNG, JPEG, and WebP exports plus portable project import/export.
- Public project, portable bundle, and AI edit-plan schemas.
- Modal account entry with a useful on-device profile fallback and a secure
  cookie/CSRF client contract for the private account service. Provider
  connections never pretend to succeed when that service is unavailable.
- Separate ChatGPT/Codex plugin and OpenAI API connection states, with opaque
  receipts and no provider-secret input in browser or extension code.
- Manifest V3 extension with visible-page capture and a packaged copy of the
  same local editor.

## Product boundary

- **Public here:** editor UI, browser extension, local project model, schemas,
  API clients, MCP contracts, public skills, and sanitized examples.
- **Optional private services:** user authentication, encrypted BYOK vault,
  synchronization, managed agent sandboxes, operational automation, and billing.
- A ChatGPT subscription connects through an ImageStitch MCP plugin; it is not
  treated as API credit or converted into an API key.
- User-supplied OpenAI API keys must never be embedded in browser or extension
  code. Production BYOK uses a server-side encrypted vault and opaque connection
  identifiers.

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
`artifacts/image-stitch-extension`. Load that directory from
`chrome://extensions` with Developer mode enabled.

## Plans and decisions

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Product and interaction design](docs/DESIGN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Account and AI connection contract](docs/ACCOUNT_AND_AI_CONNECTIONS.md)
- [Open image search and attribution](docs/IMAGE_SEARCH.md)
- [Open-source foundation](docs/OPEN_SOURCE_FOUNDATION.md)

## License

MIT. Third-party packages and future content assets retain their own licenses;
the dependency and asset license audit is a release gate.
