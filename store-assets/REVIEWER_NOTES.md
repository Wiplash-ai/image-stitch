# GlassWare reviewer notes

GlassWare has a complete account-free review path.

1. Install the extension.
2. Click the GlassWare toolbar icon and confirm it opens `app/app.html` directly without a popup.
3. Open an ordinary HTTPS page, right-click the page, and choose **Capture page with GlassWare**.
4. GlassWare focuses the editor, consumes the pending screenshot once, and saves the resulting project locally.
5. Edit any text, shape, image, or layer and use **Export** to download the result.

The extension does not use remote JavaScript or WebAssembly. Openverse responses, selected images, and Google Font files are data resources processed by code bundled in the extension.

**Sign in** and **Ask AI** open native modal/widget surfaces in the packaged editor. Sign-in requests optional access only to `auth.wiplash.ai`, uses `chrome.identity.launchWebAuthFlow` with S256 PKCE, and stores one revocable opaque GlassWare session token—never a Google, GitHub, GitLab, Keycloak, OpenAI, or ChatGPT credential. No reviewer account or provider credential is required to verify the extension's account-free editing, local persistence, capture, and export purpose.
