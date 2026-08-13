# Open-source foundation

GlassWare uses only MIT-licensed editor foundations selected during the
2026-08-12 research pass.

| Project | Role | License posture |
| --- | --- | --- |
| Konva | Primary canvas adapter | MIT |
| Fabric.js | Evaluated canvas alternative and implementation reference | MIT |
| miniPaint | Photo-tool implementation reference | MIT |
| Filerobot Image Editor | Photo-editing UX reference | MIT |
| Cropper.js | Candidate focused crop module | MIT |
| pica | Candidate browser resize module | MIT |
| Filerobot's Konva architecture | Editor integration reference | MIT |
| Openverse API | Openly licensed image search adapter | MIT service code; indexed media retains its own license |

Polotno and IMG.LY are explicitly excluded from the implementation foundation
because production use requires non-MIT commercial licensing. Open Design may
be consulted as a small Fabric-based reference, but its young repository and
ecosystem dependencies make it unsuitable as GlassWare's base.

Before adopting code from any reference, verify the exact commit, its license,
all copied-file notices, runtime dependencies, and bundled content. Fonts,
templates, stock media, icons, and ML model weights require separate inventories;
an MIT application license does not automatically cover those assets.
