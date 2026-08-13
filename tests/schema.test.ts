import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import projectSchema from "../public/schemas/project.v1.schema.json";
import bundleSchema from "../public/schemas/bundle.v1.schema.json";
import { createProject, SHAPE_KINDS } from "../src/lib/model";

function validator() {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  ajv.addSchema(projectSchema);
  return ajv;
}

describe("public JSON schemas", () => {
  it("accepts the live project model", () => {
    const validate = validator().getSchema(projectSchema.$id)!;
    const project = createProject("Schema fixture");
    expect(validate(project), JSON.stringify(validate.errors)).toBe(true);
  });

  it("accepts a portable project bundle", () => {
    const project = createProject("Portable fixture", false);
    const validate = validator().compile(bundleSchema);
    expect(validate({
      schemaVersion: "imagestitch.bundle.v1",
      exportedAt: new Date().toISOString(),
      project,
      assets: [],
    }), JSON.stringify(validate.errors)).toBe(true);
  });

  it("accepts the non-destructive image fields emitted by the editor", () => {
    const project = createProject("Edited image", false);
    project.objects.push({
      id: crypto.randomUUID(), kind: "image", name: "Portrait", assetId: crypto.randomUUID(),
      x: 10, y: 20, width: 400, height: 400, rotation: 0, scaleX: 1, scaleY: 1,
      opacity: 1, visible: true, locked: false,
      crop: { x: 0.2, y: 0, width: 0.6, height: 1 },
      adjustments: { brightness: 0.1, contrast: 12, saturation: 0.2, blur: 0, grayscale: false, sepia: false },
    });
    const validate = validator().getSchema(projectSchema.$id)!;
    expect(validate(project), JSON.stringify(validate.errors)).toBe(true);
  });

  it("accepts every shape in the public element library", () => {
    const validate = validator().getSchema(projectSchema.$id)!;
    for (const shape of SHAPE_KINDS) {
      const project = createProject(`Schema ${shape}`);
      const shapeNode = project.objects.find((object) => object.kind === "shape")!;
      project.objects = project.objects.map((object) => object.id === shapeNode.id ? { ...object, shape } : object);
      expect(validate(project), `${shape}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it("accepts searched-image attribution in portable bundles", () => {
    const project = createProject("Attributed image", false);
    const validate = validator().compile(bundleSchema);
    expect(validate({
      schemaVersion: "imagestitch.bundle.v1",
      exportedAt: new Date().toISOString(),
      project,
      assets: [{
        id: crypto.randomUUID(), projectId: project.id, name: "flower.png", mimeType: "image/png",
        size: 1, width: 1, height: 1, createdAt: new Date().toISOString(), dataUrl: "data:image/png;base64,AA==",
        source: {
          provider: "openverse", sourceUrl: "https://example.com/flower", creator: "Creator",
          license: "BY", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", attribution: "Flower by Creator, CC BY 4.0.",
        },
      }],
    }), JSON.stringify(validate.errors)).toBe(true);
  });
});
