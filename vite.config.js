import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // relative asset paths so the build can be dropped into any static path
  base: "./",
  build: {
    // The JSON editor is ~350 kB of the bundle. That is a known, accepted cost
    // (see README), so the default 500 kB warning would just be noise that
    // trains people to ignore build warnings.
    chunkSizeWarningLimit: 700,
  },
});
