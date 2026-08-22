import { describe, expect, it } from "vitest";
import { alignObjects, distributeObjects, groupObjects, selectionForObject, ungroupObjects } from "../src/lib/editor-commands";
import { createProject, type DesignNode } from "../src/lib/model";

function shape(id: string, x: number, y: number, width = 100, height = 100): DesignNode {
  return {
    id, kind: "shape", shape: "rect", name: id, x, y, width, height,
    rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, visible: true, locked: false,
    fill: "#111111", cornerRadius: 0,
  };
}

describe("editor layout commands", () => {
  const canvas = createProject("Layout", false).canvas;

  it("aligns a selection to its bounds or the canvas", () => {
    const objects = [shape("a", 100, 100, 100), shape("b", 300, 240, 200)];
    expect(alignObjects(objects, ["a", "b"], canvas, "left").map((object) => object.x)).toEqual([100, 100]);
    expect(alignObjects(objects, ["a", "b"], canvas, "center", "canvas").map((object) => object.x)).toEqual([490, 440]);
    expect(alignObjects(objects, ["a", "b"], canvas, "bottom", "canvas").map((object) => object.y)).toEqual([980, 980]);
  });

  it("distributes three objects with equal gaps", () => {
    const distributed = distributeObjects([
      shape("a", 0, 0, 100), shape("b", 130, 0, 100), shape("c", 400, 0, 100),
    ], ["a", "b", "c"], "horizontal");
    expect(distributed.map((object) => object.x)).toEqual([0, 200, 400]);
  });

  it("groups, selects, and ungroups related layers", () => {
    const grouped = groupObjects([shape("a", 0, 0), shape("b", 100, 0), shape("c", 200, 0)], ["a", "b"], "group-1");
    expect(selectionForObject(grouped, "a")).toEqual(["a", "b"]);
    expect(ungroupObjects(grouped, ["a"])).toEqual([
      expect.objectContaining({ id: "a", groupId: undefined }),
      expect.objectContaining({ id: "b", groupId: undefined }),
      expect.objectContaining({ id: "c" }),
    ]);
  });
});
