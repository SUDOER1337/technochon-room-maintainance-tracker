import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  server: {
    port: 7170,
    open: true,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
