import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    clearScreen: false,
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.VITE_SUPABASE_URL || env.SUPABASE_URL || ""
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""
      ),
    },
    server: {
      port: 5173,
      strictPort: true,
      host: host || false,
      hmr: host
        ? { protocol: "ws", host, port: 5174 }
        : undefined,
      watch: { ignored: ["**/src-tauri/**"] },
    },
    envPrefix: ["VITE_", "TAURI_ENV_"],
    build: {
      target:
        process.env.TAURI_ENV_PLATFORM === "windows"
          ? "chrome105"
          : ["es2021", "chrome100", "safari13"],
      minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
    },
  };
});
