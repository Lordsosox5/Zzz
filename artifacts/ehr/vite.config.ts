import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const isBuild = process.argv.includes("build");

// Detect Tauri environment via either:
//   VITE_TAURI=true  — set manually when running tauri dev / tauri build
//   TAURI_ENV_PLATFORM — injected automatically by the Tauri CLI during tauri build
const isTauri =
  process.env.VITE_TAURI === "true" || !!process.env.TAURI_ENV_PLATFORM;

// PORT is only needed when running the dev/preview server, not during build
const rawPort = process.env.PORT;
if (!isBuild && !isTauri && !rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = rawPort ? Number(rawPort) : 5000;
if (!isBuild && !isTauri && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Desktop apps load assets from disk (no web server), so Vite must emit
// relative paths ("./assets/…") instead of absolute paths ("/assets/…").
// In the Replit web environment BASE_PATH is provided explicitly.
const basePath = isTauri
  ? "./"
  : (process.env.BASE_PATH ?? (isBuild ? "./" : "/"));

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  optimizeDeps: {
    include: ["xlsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "..", "..", ".."),
      ],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
