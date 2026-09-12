import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production build only: Lugas serves `dist/` (ADR-0037). `vite dev` remains
// available for frontend iteration against a separately started API, but the
// deployed shape is build-then-serve — no dev tooling in production.
export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    outDir: "dist",
  },
});
