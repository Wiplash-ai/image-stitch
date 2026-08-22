export type HostedEditorIntent = "account" | "ai";

export const HOSTED_GLASSWARE_EDITOR_URL = "https://labs.wiplash.ai/glassware/app.html";

export function isExtensionSurface(protocol = globalThis.location?.protocol ?? ""): boolean {
  return protocol === "chrome-extension:" || protocol === "moz-extension:";
}

export function hostedGlassWareUrl(intent: HostedEditorIntent): string {
  const url = new URL(HOSTED_GLASSWARE_EDITOR_URL);
  url.searchParams.set("from", "extension");
  url.searchParams.set("intent", intent);
  return url.toString();
}
