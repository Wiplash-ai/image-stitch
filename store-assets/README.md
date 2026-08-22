# GlassWare store assets

This directory is the canonical, reviewable source for the browser-store listing.

- `LISTING.md`: shared listing copy, permission explanations, and data-use disclosure.
- `REVIEWER_NOTES.md`: exact certification path with no account or credential required.
- `screenshots/`: five actual 1280x800 editor screenshots generated from a fresh local profile.
- `promo/`: source SVG and exported PNG promotional artwork.

Regenerate the screenshots after a production build with `npm run store:assets`. Do not stretch or crop screenshots after generation. Recheck every store's live fields before uploading because store requirements change independently.
