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
- Upload, paste, drag/drop, and browser-extension capture import.
- Square, portrait, story, and landscape presets.
- Layer reorder, rename, duplicate, lock, hide, delete, and object inspector.
- Snapshot undo/redo, keyboard nudging/shortcuts, and visible autosave receipts.
- IndexedDB projects and original image blobs with reload recovery.
- Full-size PNG, JPEG, and WebP exports plus portable project import/export.
- Public project, portable bundle, and AI edit-plan schemas.
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
- [Open-source foundation](docs/OPEN_SOURCE_FOUNDATION.md)

## License

MIT. Third-party packages and future content assets retain their own licenses;
the dependency and asset license audit is a release gate.
