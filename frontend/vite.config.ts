import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:8000";

  return {
    plugins: [
      tanstackStart({
        server: { entry: "server" },
      }),
      nitro({
        preset: "vercel",
        routeRules: {
          "/api/**": {
            proxy: backendUrl + "/api/**",
          },
        },
      }),
      viteReact(),
      tsConfigPaths(),
      tailwindcss(),
    ],
  };
});

