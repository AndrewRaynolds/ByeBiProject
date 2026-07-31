import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ command, mode }) => {
  const envDir = path.resolve(import.meta.dirname);
  const fileEnv = loadEnv(mode, envDir, "");
  const clientEnv = {
    VITE_SUPABASE_URL:
      process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:
      process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY,
  };

  if (command === "build") {
    const missingVariables = Object.entries(clientEnv)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required client environment variables: ${missingVariables.join(", ")}`,
      );
    }
  }

  const plugins = [react(), runtimeErrorOverlay(), themePlugin()];

  if (command === "serve" && process.env.REPL_ID !== undefined) {
    const { cartographer } = await import(
      "@replit/vite-plugin-cartographer"
    );
    plugins.push(cartographer());
  }

  return {
    envDir,
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
  };
});
