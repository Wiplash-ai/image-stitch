export function isExtensionSurface(protocol = globalThis.location?.protocol ?? ""): boolean {
  return protocol === "chrome-extension:" || protocol === "moz-extension:";
}
