import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

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
        enabled: true,
        type: "module",
      },
    }),
  ],
  server: { strictPort: true },
});
