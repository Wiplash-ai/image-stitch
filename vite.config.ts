import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: [
      {
        find: /^konva$/,
        replacement: new URL("./src/lib/konva-runtime.ts", import.meta.url).pathname,
      },
    ],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        landing: new URL("./index.html", import.meta.url).pathname,
        app: new URL("./app.html", import.meta.url).pathname,
        pricing: new URL("./pricing.html", import.meta.url).pathname,
        privacy: new URL("./privacy.html", import.meta.url).pathname,
      },
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/") || id.includes("/node_modules/scheduler/")) return "react-vendor";
          if (id.includes("/node_modules/konva/")) return "canvas-vendor";
        },
      },
    },
  },
});
