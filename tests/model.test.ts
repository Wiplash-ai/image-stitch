import { describe, expect, it } from "vitest";
import { createProject, setCanvasPreset } from "../src/lib/model";

describe("ImageStitch project model", () => {
  it("creates a local square project with a first revision", () => {
    const project = createProject("Birthday card");
    expect(project.schemaVersion).toBe("imagestitch.project.v1");
    expect(project.residency).toBe("local");
    expect(project.canvas).toMatchObject({ preset: "square", width: 1080, height: 1080 });
    expect(project.revisions).toHaveLength(1);
  });

  it("commits a revision when the canvas preset changes", () => {
    const project = setCanvasPreset(createProject(), "story");
    expect(project.canvas).toMatchObject({ preset: "story", width: 1080, height: 1920 });
    expect(project.revisions).toHaveLength(2);
    expect(project.currentRevisionId).toBe(project.revisions[1].id);
  });
});
