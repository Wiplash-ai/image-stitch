import {
  CANVAS_PRESETS,
  cloneArtworkPresentation,
  cloneObjectShadow,
  commitSnapshot,
  newId,
  type CanvasSettings,
  type DesignNode,
  type GlassWareProject,
  type ShapeKind,
} from "./model";

export interface GlassWareTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: [string, string, string];
  canvas: CanvasSettings;
  objects: DesignNode[];
}

function canvas(preset: "square" | "portrait" | "story" | "landscape", background: string): CanvasSettings {
  const source = CANVAS_PRESETS[preset];
  return {
    ...source,
    background,
    presentation: cloneArtworkPresentation(source.presentation),
    guides: [],
    snapping: { ...source.snapping },
  };
}

function text(name: string, value: string, x: number, y: number, width: number, fontSize: number, fill: string, align: "left" | "center" | "right" = "left", fontStyle = "bold"): DesignNode {
  return {
    id: newId(), kind: "text", name, text: value, x, y, width, height: fontSize * 2.4,
    rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
    fill, fontFamily: "Helvetica", fontSize, fontStyle, align, lineHeight: 1.05, shadow: cloneObjectShadow(),
  };
}

function shape(name: string, kind: ShapeKind, x: number, y: number, width: number, height: number, fill: string, rotation = 0): DesignNode {
  return {
    id: newId(), kind: "shape", name, shape: kind, x, y, width, height, rotation,
    scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false, fill,
    cornerRadius: kind === "rounded-rect" ? Math.min(width, height) * 0.12 : 0, shadow: cloneObjectShadow(),
  };
}

export const GLASSWARE_TEMPLATES: GlassWareTemplate[] = [
  {
    id: "bold-birthday", name: "Bold birthday", category: "Celebration", description: "A bright square card with editable age and greeting.",
    colors: ["#ff4b4b", "#ffe83b", "#111111"], canvas: canvas("square", "#ffe83b"),
    objects: [
      shape("Red arch", "ellipse", 650, -150, 560, 560, "#ff4b4b"),
      text("Birthday label", "HAPPY\nBIRTHDAY", 92, 105, 780, 112, "#111111"),
      shape("Age badge", "ellipse", 720, 655, 235, 235, "#111111"),
      text("Age", "40", 735, 690, 205, 112, "#ffffff", "center"),
      text("Name", "CELEBRATING YOU", 95, 850, 570, 34, "#111111", "left", "normal"),
    ],
  },
  {
    id: "clean-announcement", name: "Clean announcement", category: "Social", description: "A restrained portrait announcement for launches and events.",
    colors: ["#111111", "#ffffff", "#2ca8ff"], canvas: canvas("portrait", "#ffffff"),
    objects: [
      shape("Top rule", "rect", 84, 96, 912, 18, "#111111"),
      text("Eyebrow", "NEW FROM WIPLASH LABS", 86, 165, 900, 30, "#2ca8ff"),
      text("Announcement", "A clear headline\nthat earns attention.", 84, 270, 900, 88, "#111111"),
      shape("Feature field", "rounded-rect", 84, 650, 912, 430, "#f1f1f1"),
      text("Supporting copy", "Add the useful details here. Keep the hierarchy simple and the next action obvious.", 140, 740, 800, 39, "#111111", "left", "normal"),
      shape("Action", "rounded-rect", 140, 940, 360, 82, "#111111"),
      text("Action label", "LEARN MORE", 165, 962, 310, 29, "#ffffff", "center"),
    ],
  },
  {
    id: "glass-story", name: "Glass story", category: "Story", description: "A stained-glass-inspired vertical promo with bold type.",
    colors: ["#7c5cff", "#2fca75", "#111111"], canvas: canvas("story", "#111111"),
    objects: [
      shape("Violet pane", "rect", -120, 80, 700, 720, "#7c5cff", -8),
      shape("Green pane", "rect", 560, 460, 650, 760, "#2fca75", 10),
      shape("White card", "rounded-rect", 90, 1080, 900, 610, "#ffffff"),
      text("Story headline", "MAKE IT\nWORTH KEEPING.", 145, 1190, 790, 92, "#111111"),
      text("Story detail", "A flexible story layout for promotions, quotes, and announcements.", 150, 1480, 750, 35, "#111111", "left", "normal"),
    ],
  },
  {
    id: "product-banner", name: "Product banner", category: "Marketing", description: "A wide product or article banner with a strong callout.",
    colors: ["#111111", "#ff9f1c", "#ffffff"], canvas: canvas("landscape", "#f5f5f5"),
    objects: [
      shape("Dark field", "rect", 0, 0, 550, 628, "#111111"),
      text("Banner headline", "BUILD THE\nBETTER THING.", 70, 100, 420, 66, "#ffffff"),
      text("Banner copy", "A concise supporting line belongs here.", 72, 360, 390, 26, "#ffffff", "left", "normal"),
      shape("Product card", "rounded-rect", 675, 95, 390, 440, "#ff9f1c", -3),
      shape("Product mark", "diamond", 770, 190, 200, 200, "#ffffff", 5),
    ],
  },
];

export function createTemplateSnapshot(templateId: string): { canvas: CanvasSettings; objects: DesignNode[] } | null {
  const template = GLASSWARE_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;
  return {
    canvas: { ...template.canvas, presentation: cloneArtworkPresentation(template.canvas.presentation), guides: [], snapping: { ...template.canvas.snapping } },
    objects: template.objects.map((object) => ({ ...object, id: newId(), ...(object.kind === "image" ? { crop: { ...object.crop }, adjustments: { ...object.adjustments }, presentation: { ...object.presentation, frame: { ...object.presentation.frame }, shadow: { ...object.presentation.shadow } }, mask: { ...object.mask, strokes: object.mask.strokes.map((stroke) => ({ ...stroke, points: [...stroke.points] })) } } : { shadow: object.shadow ? { ...object.shadow } : undefined }) })),
  };
}

export function applyTemplate(project: GlassWareProject, templateId: string): GlassWareProject {
  const template = GLASSWARE_TEMPLATES.find((item) => item.id === templateId);
  const snapshot = createTemplateSnapshot(templateId);
  if (!template || !snapshot) return project;
  return commitSnapshot(project, `Template applied: ${template.name}`, snapshot);
}
