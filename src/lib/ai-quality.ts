import type { ExportAssetDetail } from "./export-qa";
import type { DesignNode, GlassWareProject } from "./model";

export type AiQualitySeverity = "error" | "warning" | "info";

export interface AiQualityFinding {
  code: "clipped" | "outside" | "safe-zone" | "low-resolution" | "low-contrast" | "empty-text";
  severity: AiQualitySeverity;
  message: string;
  pageId: string;
  objectId?: string;
}

export interface AiRequestCheck {
  code: string;
  label: string;
  passed: boolean;
  blocking: boolean;
}

export interface AiQualityReport {
  findings: AiQualityFinding[];
  requestChecks: AiRequestCheck[];
  blockingFailures: string[];
  summary: string;
}

export interface AiQualityOptions {
  assets?: ReadonlyMap<string, ExportAssetDetail>;
  originalProject?: GlassWareProject;
  prompt?: string;
  completedSteps?: readonly string[];
  generatedImageCount?: number;
}

function pages(project: GlassWareProject) {
  return project.pages.map((page) => page.id === project.activePageId
    ? { ...page, canvas: project.canvas, objects: project.objects }
    : page);
}

function bounds(object: DesignNode) {
  const width = Math.abs(object.width * object.scaleX);
  const height = Math.abs(object.height * object.scaleY);
  const radians = object.rotation * Math.PI / 180;
  const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  const centerX = object.x + width / 2;
  const centerY = object.y + height / 2;
  return { left: centerX - rotatedWidth / 2, top: centerY - rotatedHeight / 2, right: centerX + rotatedWidth / 2, bottom: centerY + rotatedHeight / 2 };
}

function parseHex(value: string): [number, number, number] | null {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].split("").map((part) => `${part}${part}`).join("") : match[1];
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}

function luminance(color: [number, number, number]) {
  const channels = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number | null {
  const foregroundColor = parseHex(foreground);
  const backgroundColor = parseHex(background);
  if (!foregroundColor || !backgroundColor) return null;
  const foregroundLuminance = luminance(foregroundColor);
  const backgroundLuminance = luminance(backgroundColor);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function normalized(value: string) {
  return value.toLocaleLowerCase().replace(/[“”"'`]/g, "").replace(/\s+/g, " ").trim();
}

function requestedPageName(prompt: string): string | null {
  const match = prompt.match(/(?:name (?:it|the (?:new |active )?page)|rename (?:it|the (?:new |active )?page) to|page (?:named|called))\s+["“]?([^,.\n]+?)["”]?(?=\s+(?:then|and|using|with|without)\b|[,.\n]|$)/i);
  return match?.[1]?.trim() || null;
}

function requestChecks(project: GlassWareProject, options: AiQualityOptions): AiRequestCheck[] {
  const prompt = normalized(options.prompt ?? "");
  if (!prompt) return [];
  const active = pages(project).find((page) => page.id === project.activePageId)!;
  const original = options.originalProject;
  const checks: AiRequestCheck[] = [];
  const add = (code: string, label: string, passed: boolean, blocking = true) => checks.push({ code, label, passed, blocking });
  if (/\b(?:add|create|make) (?:a |one )?new page\b/.test(prompt) && original) {
    add("new-page", "A new page exists", project.pages.length > original.pages.length);
  }
  const pageName = requestedPageName(options.prompt ?? "");
  if (pageName) add("page-name", `A page is named ${pageName}`, pages(project).some((page) => normalized(page.name) === normalized(pageName)));
  if (/\bvertical (?:center |centre )?guide\b/.test(prompt)) {
    add("vertical-guide", "A vertical center guide exists", active.canvas.guides.some((guide) => guide.axis === "x" && Math.abs(guide.position - active.canvas.width / 2) <= 1));
  }
  if (/\bhorizontal (?:center |centre )?guide\b/.test(prompt)) {
    add("horizontal-guide", "A horizontal center guide exists", active.canvas.guides.some((guide) => guide.axis === "y" && Math.abs(guide.position - active.canvas.height / 2) <= 1));
  }
  if (/\bsnapp(?:ing|ed)|\bsnap enabled\b/.test(prompt)) add("snapping", "Snapping is enabled", active.canvas.snapping.enabled);
  if (/\bgroup\b/.test(prompt) && !/\bungroup\b/.test(prompt)) {
    const groups = new Map<string, number>();
    for (const object of active.objects) if (object.groupId) groups.set(object.groupId, (groups.get(object.groupId) ?? 0) + 1);
    add("group", "At least two layers remain grouped", [...groups.values()].some((count) => count >= 2));
  }
  if (/\bshadow\b/.test(prompt)) {
    const hasShadow = active.canvas.presentation.shadow.enabled || active.objects.some((object) => object.kind === "image" ? object.presentation.shadow.enabled : object.shadow?.enabled);
    add("shadow", "A native editable shadow exists", Boolean(hasShadow));
  }
  if (/\b(?:generate|create|make) (?:a |an )?(?:new |original )?image\b/.test(prompt)) {
    add("generated-image", "A generated image was added", (options.generatedImageCount ?? 0) > 0);
  }
  if (/\b(?:preflight|export)\b/.test(prompt)) {
    add("export-preflight", "Export preflight produced a receipt", (options.completedSteps ?? []).some((step) => /export preflight/i.test(step)));
  }
  return checks;
}

export function assessAiQuality(project: GlassWareProject, options: AiQualityOptions = {}): AiQualityReport {
  const findings: AiQualityFinding[] = [];
  for (const page of pages(project)) {
    const safeZone = Math.max(12, Math.min(page.canvas.width, page.canvas.height) * 0.02);
    for (const object of page.objects.filter((item) => item.visible)) {
      const box = bounds(object);
      const entirelyOutside = box.right <= 0 || box.bottom <= 0 || box.left >= page.canvas.width || box.top >= page.canvas.height;
      const clipped = box.left < -1 || box.top < -1 || box.right > page.canvas.width + 1 || box.bottom > page.canvas.height + 1;
      if (entirelyOutside) findings.push({ code: "outside", severity: "error", pageId: page.id, objectId: object.id, message: `${object.name} is entirely outside ${page.name}.` });
      else if (clipped) findings.push({ code: "clipped", severity: "warning", pageId: page.id, objectId: object.id, message: `${object.name} extends beyond ${page.name}.` });
      if (object.kind === "text") {
        if (!object.text.trim()) findings.push({ code: "empty-text", severity: "error", pageId: page.id, objectId: object.id, message: `${object.name} is an empty text layer.` });
        if (box.left < safeZone || box.top < safeZone || box.right > page.canvas.width - safeZone || box.bottom > page.canvas.height - safeZone) {
          findings.push({ code: "safe-zone", severity: "warning", pageId: page.id, objectId: object.id, message: `${object.name} is inside the ${Math.round(safeZone)} px edge safe zone.` });
        }
        const ratio = contrastRatio(object.fill, page.canvas.background);
        if (ratio !== null && ratio < (object.fontSize >= 24 ? 3 : 4.5)) {
          findings.push({ code: "low-contrast", severity: "warning", pageId: page.id, objectId: object.id, message: `${object.name} has low contrast (${ratio.toFixed(1)}:1) against the artboard.` });
        }
      }
      if (object.kind === "image") {
        const asset = options.assets?.get(object.assetId);
        if (asset) {
          const requiredWidth = Math.abs(object.width * object.scaleX) / Math.max(0.01, object.crop.width);
          const requiredHeight = Math.abs(object.height * object.scaleY) / Math.max(0.01, object.crop.height);
          if (asset.width < requiredWidth * 0.75 || asset.height < requiredHeight * 0.75) {
            findings.push({ code: "low-resolution", severity: "warning", pageId: page.id, objectId: object.id, message: `${object.name} may look soft at its current crop and size.` });
          }
        }
      }
    }
  }
  const checks = requestChecks(project, options);
  const blockingFailures = checks.filter((check) => check.blocking && !check.passed).map((check) => check.label);
  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  const summary = `${errors} blocking visual issue${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}, ${checks.filter((check) => check.passed).length}/${checks.length} objective request checks passed.`;
  return { findings, requestChecks: checks, blockingFailures, summary };
}

export function aiQualityFeedback(report: AiQualityReport): string[] {
  return [
    `Automatic QA: ${report.summary}`,
    ...report.blockingFailures.map((failure) => `Request check failed: ${failure}`),
    ...report.findings.slice(0, 12).map((finding) => `${finding.severity.toUpperCase()}: ${finding.message}`),
  ];
}
