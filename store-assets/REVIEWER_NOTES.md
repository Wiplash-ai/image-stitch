# GlassWare reviewer notes

GlassWare has a complete account-free review path.

1. Install the extension.
2. Open an ordinary HTTPS page.
3. Click the GlassWare toolbar icon and choose **Capture visible page**.
4. GlassWare opens `app/app.html`, consumes the pending screenshot once, and saves the resulting project locally.
5. Edit any text, shape, image, or layer and use **Export** to download the result.
6. The context-menu command **Capture page with GlassWare** exercises the same user-invoked path.

The extension does not use remote JavaScript or WebAssembly. Openverse responses, selected images, and Google Font files are data resources processed by code bundled in the extension.

Account, cloud-storage, billing, and AI buttons intentionally open the HTTPS GlassWare web application. They do not execute remotely supplied AI edit plans inside the privileged extension origin. No reviewer account or provider credential is required to verify the extension's capture, editing, local persistence, and export purpose.
