import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// vite-plugin-pwa's injectManifest sub-build doesn't inherit the parent
// define config, so process.env.NODE_ENV survives into the SW bundle
// (process doesn't exist in SW scope). Replace it post-build.
const swProcessFix = {
  name: "sw-process-fix",
  closeBundle() {
    const swPath = "_fresh/client/sw.js";
    try {
      const content = readFileSync(swPath, "utf-8");
      writeFileSync(
        swPath,
        content.replaceAll("process.env.NODE_ENV", '"production"'),
      );
    } catch {
      // sw.js not present in dev mode — no-op
    }
  },
};

export default defineConfig({
  plugins: [
    fresh(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: ".",
      filename: "sw.ts",
      injectRegister: false,
      manifest: false,
      devOptions: {
        enabled: false,
      },
    }),
    swProcessFix,
  ],
  server: { strictPort: true },
});
