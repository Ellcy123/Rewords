import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const clientRoot = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  root: clientRoot,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: {
      allow: [projectRoot]
    },
    proxy: {
      "/api": "http://127.0.0.1:8787"
    }
  },
  build: {
    outDir: fileURLToPath(new URL("../dist/client", import.meta.url)),
    emptyOutDir: true
  }
});

