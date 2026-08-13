import { describe, expect, it } from "vitest";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import projectSchema from "../public/schemas/project.v1.schema.json";
import bundleSchema from "../public/schemas/bundle.v1.schema.json";
import { createProject } from "../src/lib/model";

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
});
