import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      proxy: {
        "/api": env.VITE_API_PROXY_TARGET || "http://localhost:5643",
        "/health": env.VITE_API_PROXY_TARGET || "http://localhost:5643",
      },
    },
  };
});
