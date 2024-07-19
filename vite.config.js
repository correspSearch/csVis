import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";
import vue2 from "@vitejs/plugin-vue2";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue2(),
    // legacy({
    //   targets: ["ie >= 11"],
    //   additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
    // }),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/csViz.js`,
        chunkFileNames: `assets/csVizChunk[hash].js`,
        assetFileNames: `assets/csViz.[ext]`,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
