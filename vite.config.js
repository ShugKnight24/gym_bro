import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { port: 3100, open: false },
  build: { outDir: "dist", target: "es2020" },
  test: { include: ["tests/unit/**/*.test.js"], environment: "node" },
});
