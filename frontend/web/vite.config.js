import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import path from "path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(
  new URL(".", import.meta.url)
);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(projectDirectory, "./src"),
      "@shared": path.resolve(
        projectDirectory,
        "../../shared"
      ),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});