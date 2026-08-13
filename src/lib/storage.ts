import type { ImageStitchProject } from "./model";

const PROJECT_KEY = "imagestitch.project.v1";
const CAPTURE_KEY = "imagestitch.pendingCapture.v1";

export function loadProject(): ImageStitchProject | null {
  try {
    const value = localStorage.getItem(PROJECT_KEY);
    return value ? (JSON.parse(value) as ImageStitchProject) : null;
  } catch {
    return null;
  }
}

export function saveProject(project: ImageStitchProject) {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
}

export async function consumeExtensionCapture(): Promise<string | null> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
  const result = await chrome.storage.local.get(CAPTURE_KEY);
  const capture = result[CAPTURE_KEY] as { dataUrl?: string } | undefined;
  if (!capture?.dataUrl) return null;
  await chrome.storage.local.remove(CAPTURE_KEY);
  return capture.dataUrl;
}
