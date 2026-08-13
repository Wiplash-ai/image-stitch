# Open image search and attribution

## Product boundary

The Images panel provides two distinct paths:

1. **Upload from computer** keeps the selected file in the local project store.
2. **Search open images** queries Openverse only after the user submits a search.

Normal editing, local upload, saved projects, and export do not depend on the
search service. No Openverse credential is included in the browser app or
extension.

## Provider contract

GlassWare uses the official [Openverse image API](https://api.openverse.org/)
without authentication. The initial search
filter includes public-domain marks, CC0, and CC BY media, excludes results
marked mature, and requests twelve results at a time. The adapter normalizes
only the fields the editor needs and converts rate limits or outages into a
recoverable panel message.

When a user adds a result, GlassWare downloads image bytes through the
Openverse image endpoint and writes them to the same IndexedDB asset store used
for local files. It also stores:

- provider;
- original source URL;
- creator and creator URL when present;
- license and license URL when present; and
- the provider's attribution statement.

That receipt is visible in the image inspector and included in portable project
bundles. It is metadata, not a guarantee: [Openverse advises users to verify a
work's license](https://docs.openverse.org/api/reference/made_with_ov.html), so
GlassWare retains a direct “Verify source” link.

## Extension permission

The packaged MV3 extension grants host access only to
`https://api.openverse.org/*` for search results, thumbnails, and user-selected
imports. It does not request broad access to arbitrary image hosts.

## Verification

- Unit tests cover query filters, result normalization, attribution mapping,
  and rate-limit errors.
- Public schemas validate attributed portable assets.
- Browser smoke intercepts the provider with a deterministic fixture and proves
  search, preview, local import, reload, bundle export, and source-receipt UI.
- Live provider behavior was checked against the official API documentation;
  automated tests do not consume the anonymous production rate limit.
