import {
  CANVAS_PRESETS,
  DEFAULT_IMAGE_ADJUSTMENTS,
  cloneImageMask,
  cloneImagePresentation,
  commitSnapshot,
  createProject,
  newId,
  type DesignNode,
  type GlassWareProject,
} from "./model";

export const STUDIO_PLAYGROUND_NAME = "Studio Playground";

export function createStudioPlaygroundProject(
  assetId: string,
  baseProject: GlassWareProject = createProject(STUDIO_PLAYGROUND_NAME, false),
): GlassWareProject {
  const imageId = newId();
  const canvas = { ...CANVAS_PRESETS.square, background: "#f2f2f2" };
  const objects: DesignNode[] = [
    {
      id: imageId,
      kind: "image",
      name: "Studio dashboard screenshot",
      assetId,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
      presentation: cloneImagePresentation(),
      mask: cloneImageMask(),
      x: 110,
      y: 255,
      width: 860,
      height: 537.5,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
    },
    {
      id: newId(),
      kind: "text",
      name: "Playground title",
      text: "Screenshot Studio playground",
      x: 110,
      y: 72,
      width: 860,
      height: 74,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#111111",
      fontFamily: "Helvetica",
      fontSize: 52,
      fontStyle: "bold",
      align: "left",
      lineHeight: 1,
    },
    {
      id: newId(),
      kind: "text",
      name: "Playground subtitle",
      text: "Style the dashboard as a selected image, then switch Studio to Whole artwork to present the complete design.",
      x: 112,
      y: 163,
      width: 820,
      height: 62,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.72,
      visible: true,
      locked: false,
      fill: "#111111",
      fontFamily: "Arial",
      fontSize: 22,
      fontStyle: "normal",
      align: "left",
      lineHeight: 1.3,
    },
    {
      id: newId(),
      kind: "text",
      name: "Playground instructions",
      text: "TRY THIS  ·  Selected image: Float  →  Whole artwork: Photo  →  Undo → Redo",
      x: 110,
      y: 866,
      width: 860,
      height: 42,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 0.8,
      visible: true,
      locked: false,
      fill: "#111111",
      fontFamily: "Arial",
      fontSize: 18,
      fontStyle: "bold",
      align: "left",
      lineHeight: 1.2,
    },
  ];

  return commitSnapshot(
    { ...baseProject, name: STUDIO_PLAYGROUND_NAME, canvas },
    "Studio playground created",
    { canvas, objects },
  );
}

export async function createStudioPlaygroundImage(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot create the Studio sample image.");

  const roundedRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string | CanvasGradient | CanvasPattern,
  ) => {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fillStyle = fill;
    context.fill();
  };
  const text = (value: string, x: number, y: number, size: number, weight = 500, color = "#111111") => {
    context.fillStyle = color;
    context.font = `${weight} ${size}px Inter, Arial, sans-serif`;
    context.fillText(value, x, y);
  };

  context.fillStyle = "#f5f5f5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.fillRect(0, 0, canvas.width, 86);
  text("GLASSWARE", 42, 54, 26, 800, "#ffffff");
  text("CREATOR OVERVIEW", 1190, 51, 14, 700, "#bdbdbd");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 86, 230, 814);
  const navItems = ["Overview", "Projects", "Assets", "Brand kits", "Exports"];
  navItems.forEach((label, index) => {
    const y = 142 + index * 68;
    if (index === 0) roundedRect(24, y - 31, 182, 48, 9, "#111111");
    roundedRect(43, y - 15, 17, 17, 4, index === 0 ? "#ffcb35" : "#d0d0d0");
    text(label, 76, y, 17, index === 0 ? 700 : 550, index === 0 ? "#ffffff" : "#555555");
  });
  roundedRect(24, 772, 182, 92, 10, "#f0f0f0");
  text("LOCAL FIRST", 43, 806, 13, 800, "#555555");
  text("Everything is saved", 43, 833, 13, 500, "#777777");
  text("on this device.", 43, 854, 13, 500, "#777777");

  text("Good morning, Creator.", 282, 157, 35, 800);
  text("Here’s what your workbench has been making.", 284, 193, 17, 500, "#666666");

  const cards = [
    { x: 282, label: "PROJECTS", value: "24", accent: "#ff6464" },
    { x: 610, label: "EXPORTS", value: "87", accent: "#ffcb35" },
    { x: 938, label: "LOCAL ASSETS", value: "156", accent: "#44d692" },
  ];
  cards.forEach((card) => {
    roundedRect(card.x, 236, 290, 150, 14, "#ffffff");
    roundedRect(card.x + 22, 258, 38, 8, 4, card.accent);
    text(card.label, card.x + 22, 299, 13, 800, "#777777");
    text(card.value, card.x + 22, 355, 45, 800);
  });

  roundedRect(282, 420, 636, 410, 14, "#ffffff");
  text("Creative activity", 310, 466, 21, 750);
  text("LAST 8 WEEKS", 752, 464, 12, 800, "#888888");
  context.strokeStyle = "#e7e7e7";
  context.lineWidth = 2;
  for (let index = 0; index < 5; index += 1) {
    const y = 518 + index * 58;
    context.beginPath();
    context.moveTo(310, y);
    context.lineTo(887, y);
    context.stroke();
  }
  const values = [62, 95, 78, 132, 110, 168, 146, 203];
  values.forEach((value, index) => {
    const width = 42;
    const height = value;
    const x = 334 + index * 68;
    const gradient = context.createLinearGradient(0, 726 - height, 0, 726);
    gradient.addColorStop(0, index % 3 === 0 ? "#ff6464" : index % 3 === 1 ? "#7c5cff" : "#44d692");
    gradient.addColorStop(1, "#111111");
    roundedRect(x, 726 - height, width, height, 8, gradient);
  });
  text("JUN", 334, 772, 12, 700, "#888888");
  text("JUL", 596, 772, 12, 700, "#888888");
  text("AUG", 808, 772, 12, 700, "#888888");

  roundedRect(950, 420, 258, 410, 14, "#111111");
  text("Current streak", 978, 470, 19, 700, "#ffffff");
  text("12", 978, 566, 74, 800, "#ffffff");
  text("DAYS CREATING", 981, 600, 13, 800, "#bdbdbd");
  roundedRect(978, 651, 198, 2, 1, "#424242");
  roundedRect(978, 681, 132, 42, 8, "#ffffff");
  text("Keep going  →", 1000, 708, 14, 750, "#111111");

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("The Studio sample image could not be encoded.")), "image/png");
  });
  return new File([blob], "studio-dashboard.png", { type: "image/png" });
}
