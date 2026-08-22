import { describe, expect, it } from "vitest";
import { createProject, undoProject } from "../src/lib/model";
import { applyTemplate, GLASSWARE_TEMPLATES } from "../src/lib/templates";

describe("GlassWare templates", () => {
  it("provides editable, asset-free templates for each core canvas shape", () => {
    expect(GLASSWARE_TEMPLATES.map((template) => template.canvas.preset)).toEqual(expect.arrayContaining(["square", "portrait", "story", "landscape"]));
    expect(GLASSWARE_TEMPLATES.every((template) => template.objects.every((object) => object.kind !== "image"))).toBe(true);
  });

  it("applies a template as an undoable active-page edit", () => {
    const project = createProject("Template test", false);
    const next = applyTemplate(project, "bold-birthday");
    expect(next.objects.length).toBeGreaterThan(0);
    expect(next.canvas.background).toBe("#ffe83b");
    expect(undoProject(next).objects).toHaveLength(0);
  });
});
