import { describe, expect, it } from "vitest";
import { createProject } from "../src/lib/model";
import {
  STUDIO_PLAYGROUND_NAME,
  createStudioPlaygroundProject,
} from "../src/lib/studio-playground";

describe("Studio Playground", () => {
  it("creates a selected-image-friendly local project with neutral presentation", () => {
    const project = createStudioPlaygroundProject(
      "11111111-1111-4111-8111-111111111111",
      createProject(STUDIO_PLAYGROUND_NAME, false),
    );
    const image = project.objects[0];

    expect(project.name).toBe(STUDIO_PLAYGROUND_NAME);
    expect(project.canvas).toMatchObject({ width: 1080, height: 1080, background: "#f2f2f2" });
    expect(image).toMatchObject({
      kind: "image",
      name: "Studio dashboard screenshot",
      width: 860,
      presentation: {
        cornerRadius: 0,
        frame: { type: "none", width: 0 },
        shadow: { enabled: false },
      },
    });
    expect(project.revisions.at(-1)?.summary).toBe("Studio playground created");
  });
});
