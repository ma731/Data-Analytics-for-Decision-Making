import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /api to the FastAPI backend. Defaults to :8000; override
// with VITE_API_TARGET (e.g. http://127.0.0.1:8011) when 8000 is already taken.
const API_TARGET = process.env.VITE_API_TARGET || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": API_TARGET,
    },
  },
});
