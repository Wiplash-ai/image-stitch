import {
  cloneImagePresentation,
  type ImageFrameType,
  type ImagePresentation,
  type ImageShadow,
  type ArtworkBackdropType,
} from "./model";

export type ScreenshotStudioPresentationOperation =
  | { op: "set_border_radius"; radius: number }
  | {
      op: "set_frame";
      frame: {
        type: ImageFrameType;
        width?: number;
        color?: string;
        opacity?: number;
        padding?: number;
        title?: string;
      };
    }
  | { op: "set_shadow"; shadow: Partial<ImageShadow> };

export interface PresentationPreset {
  id: "clean" | "floating" | "outlined" | "photograph";
  label: string;
  description: string;
  operations: ScreenshotStudioPresentationOperation[];
}

export const PRESENTATION_PRESETS: PresentationPreset[] = [
  {
    id: "clean",
    label: "Clean",
    description: "Sharp and unframed",
    operations: [
      { op: "set_border_radius", radius: 0 },
      { op: "set_frame", frame: { type: "none", width: 0 } },
      { op: "set_shadow", shadow: { enabled: false } },
    ],
  },
  {
    id: "floating",
    label: "Float",
    description: "Soft depth and curved corners",
    operations: [
      { op: "set_border_radius", radius: 18 },
      { op: "set_frame", frame: { type: "none", width: 0 } },
      { op: "set_shadow", shadow: { enabled: true, blur: 48, offsetX: 0, offsetY: 12, opacity: 0.28 } },
    ],
  },
  {
    id: "outlined",
    label: "Outline",
    description: "Crisp dark edge with depth",
    operations: [
      { op: "set_border_radius", radius: 12 },
      { op: "set_frame", frame: { type: "border-dark", width: 2, color: "#111111", opacity: 1 } },
      { op: "set_shadow", shadow: { enabled: true, blur: 24, offsetX: 0, offsetY: 8, opacity: 0.2 } },
    ],
  },
  {
    id: "photograph",
    label: "Photo",
    description: "White print border",
    operations: [
      { op: "set_border_radius", radius: 3 },
      { op: "set_frame", frame: { type: "photograph", width: 14, color: "#ffffff", opacity: 1 } },
      { op: "set_shadow", shadow: { enabled: true, blur: 28, offsetX: 0, offsetY: 10, opacity: 0.24 } },
    ],
  },
];

export const SHADOW_PRESETS = [
  { id: "none", label: "None", shadow: { enabled: false } },
  { id: "hug", label: "Hug", shadow: { enabled: true, blur: 12, offsetX: 0, offsetY: 2, opacity: 0.2 } },
  { id: "soft", label: "Soft", shadow: { enabled: true, blur: 48, offsetX: 0, offsetY: 12, opacity: 0.28 } },
  { id: "strong", label: "Strong", shadow: { enabled: true, blur: 80, offsetX: 0, offsetY: 24, opacity: 0.45 } },
] as const;

export const FRAME_PRESETS: Array<{
  type: ImageFrameType;
  label: string;
  width: number;
  color: string;
  padding: number;
  title: string;
}> = [
  { type: "none", label: "None", width: 0, color: "#111111", padding: 0, title: "" },
  { type: "macos-light", label: "Mac light", width: 1, color: "#ececec", padding: 32, title: "GlassWare" },
  { type: "macos-dark", label: "Mac dark", width: 1, color: "#242424", padding: 32, title: "GlassWare" },
  { type: "windows-light", label: "Windows", width: 1, color: "#f3f3f3", padding: 30, title: "GlassWare" },
  { type: "arc-dark", label: "Arc", width: 1, color: "#202124", padding: 30, title: "glassware.app" },
  { type: "glass-light", label: "Glass", width: 8, color: "#ffffff", padding: 12, title: "" },
  { type: "border-dark", label: "Border", width: 2, color: "#111111", padding: 0, title: "" },
  { type: "photograph", label: "Photo", width: 14, color: "#ffffff", padding: 14, title: "" },
];

export interface BackdropPreset {
  id: string;
  label: string;
  type: ArtworkBackdropType;
  value: string;
  colors: [string, string, string?];
}

export const BACKDROP_PRESETS: BackdropPreset[] = [
  { id: "graphite", label: "Graphite", type: "gradient", value: "graphite", colors: ["#111111", "#575757"] },
  { id: "daybreak", label: "Daybreak", type: "gradient", value: "daybreak", colors: ["#ff875f", "#ffd36d", "#fff2c4"] },
  { id: "lagoon", label: "Lagoon", type: "gradient", value: "lagoon", colors: ["#0b5367", "#32c3bd", "#c6fff0"] },
  { id: "prism", label: "Prism", type: "gradient", value: "prism", colors: ["#ff5d42", "#7454d6", "#24a8a8"] },
  { id: "paper", label: "Paper", type: "gradient", value: "paper", colors: ["#ffffff", "#d9d9d9"] },
  { id: "midnight", label: "Midnight", type: "gradient", value: "midnight", colors: ["#070b16", "#203868", "#6f7fff"] },
];

export function findBackdropPreset(value: string): BackdropPreset {
  return BACKDROP_PRESETS.find((preset) => preset.value === value) ?? BACKDROP_PRESETS[0];
}

export function applyScreenshotStudioOperations(
  current: ImagePresentation,
  operations: ScreenshotStudioPresentationOperation[],
): ImagePresentation {
  const next = cloneImagePresentation(current);
  for (const operation of operations) {
    if (operation.op === "set_border_radius") {
      next.cornerRadius = operation.radius;
    } else if (operation.op === "set_frame") {
      next.frame = { ...next.frame, ...operation.frame };
    } else {
      next.shadow = { ...next.shadow, ...operation.shadow };
    }
  }
  return next;
}
