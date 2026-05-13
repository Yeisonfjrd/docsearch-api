import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", "dist", "prisma"],
    },
  },
  resolve: {
    alias: {
      "@interface": resolve(__dirname, "src/interface"),
      "@application": resolve(__dirname, "src/application"),
      "@domain": resolve(__dirname, "src/domain"),
      "@infrastructure": resolve(__dirname, "src/infrastructure"),
    },
  },
});
