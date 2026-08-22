import Konva from "konva/lib/Core";
import { Arrow } from "konva/lib/shapes/Arrow";
import { Circle } from "konva/lib/shapes/Circle";
import { Ellipse } from "konva/lib/shapes/Ellipse";
import { Image } from "konva/lib/shapes/Image";
import { Line } from "konva/lib/shapes/Line";
import { Rect } from "konva/lib/shapes/Rect";
import { Text } from "konva/lib/shapes/Text";
import { Transformer } from "konva/lib/shapes/Transformer";
import { Blur } from "konva/lib/filters/Blur";
import { Brighten } from "konva/lib/filters/Brighten";
import { Contrast } from "konva/lib/filters/Contrast";
import { Grayscale } from "konva/lib/filters/Grayscale";
import { HSL } from "konva/lib/filters/HSL";
import { Sepia } from "konva/lib/filters/Sepia";

// Konva's default entry point eagerly installs every built-in shape and filter.
// GlassWare deliberately exposes only the primitives used by its renderer so
// the browser does not download unrelated sprites, text paths, wedges, or
// image filters. TypeScript still checks callers against Konva's public API;
// Vite redirects the runtime import to this audited subset.
export default Konva.Util._assign(Konva, {
  Arrow,
  Circle,
  Ellipse,
  Image,
  Line,
  Rect,
  Text,
  Transformer,
  Filters: {
    Blur,
    Brighten,
    Contrast,
    Grayscale,
    HSL,
    Sepia,
  },
});
