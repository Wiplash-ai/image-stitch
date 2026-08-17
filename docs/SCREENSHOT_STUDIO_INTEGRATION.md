# Screenshot Studio feature integration

## Goal

Bring Screenshot Studio's strongest presentation workflow into GlassWare
without turning ordinary image editing into a server dependency. Static image
styling remains local and reversible. A future renderer adapter may delegate
operations that genuinely need Screenshot Studio's render pipeline.

## Source audit

The local Screenshot Studio service was healthy during the August 17, 2026
integration audit. Its operation catalog groups work into source media, canvas,
styling, overlays, timeline, animations, and zooms. Its editor presents visual
presets before detailed controls, especially for border radius, frames, and
shadows.

GlassWare already has native equivalents for source-image import, canvas size
and background, editable text/image overlays, arrows and callouts, and full-size
static export. The integration therefore concentrates on reusable static-image
presentation and annotation workflows that were missing from the image and
whole-artwork models.

## Implemented locally

| Screenshot Studio operation | GlassWare behavior |
| --- | --- |
| `set_border_radius` | Rounded selected-image or whole-artwork rendering with bounded project data |
| `set_frame` | None, macOS, Windows, Arc, glass, border, and photograph shells on either target, with frame padding and optional browser title |
| `set_shadow` | None, hug, soft, and strong presets plus color, blur, horizontal/vertical offset, and opacity on either target |
| Background styling | Solid, six curated gradients, or an uploaded image with opacity, blur, and texture controls around the whole artwork |
| Screenshot markup | Straight/curved arrows, rectangles, circles, lines, visual blur, and opaque redaction as editable layers |
| Source replacement | Replace a selected image while preserving its layout, crop, adjustments, frame, and shadow |

The public adapter in `src/lib/screenshot-studio.ts` uses these operation names
and applies them to GlassWare's engine-independent image presentation model.
The Studio panel exposes explicit **Selected image** and **Whole artwork**
targets. Both receive combined Clean, Float, Outline, and Photo looks followed
by precise corner, frame, and shadow controls. Whole artwork also adds outer
spacing and rich backdrops while keeping the original design nodes editable.
The separate Annotate tool keeps screenshot markup discoverable without mixing
it into ordinary Shapes. Every committed change creates a named revision and
is included in portable project bundles and full-resolution exports.

## Deliberately deferred

- `set_perspective` needs a true perspective render path. Konva's ordinary 2D
  transforms are not an equivalent implementation.
- Image-backed blur is visual and editable. Privacy-sensitive information must
  use the opaque Redact annotation because blur is not a secure redaction.
- Trim, duration, animation, and zoom operations belong to timeline/video
  projects rather than the current static-image document.
- Server rendering will be introduced only for output that the local browser
  cannot produce faithfully, with an explicit upload and cost receipt.

## Cloud project action

When cloud project storage lands, its primary project action is labeled
**Save** and carries the tooltip **Save to cloud**. GlassWare must receive a
revision-scoped upload receipt before showing that action as complete. The
current account sync preference records intent only and does not upload a
project.

## Next product milestone

After the cloud project contract is real, define the project gallery, account,
billing, pricing, and public landing-page surfaces together. Pricing remains a
proposal until representative storage, rendering, sandbox, support, and payment
costs have been measured.
