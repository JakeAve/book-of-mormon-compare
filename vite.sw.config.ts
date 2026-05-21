import { defineConfig } from "vite";

// Builds sw.ts → static/sw.js for local dev testing.
// In production, vite-plugin-pwa handles this via the main vite.config.ts.
export default defineConfig({
  build: {
    lib: {
      entry: "sw.ts",
      formats: ["es"],
      fileName: "sw",
    },
    outDir: "static",
    emptyOutDir: false,
    rollupOptions: {
      output: { entryFileNames: "sw.js" },
    },
    // SW doesn't need minification for dev use
    minify: false,
  },
  define: {
    "self.__WB_MANIFEST": "[]",
  },
});
