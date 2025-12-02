import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          // Конфигурация Tailwind прямо здесь
          content: ["./index.html", "./**/*.{js,ts,jsx,tsx}"],
          theme: {
            extend: {},
          },
          plugins: [],
        }),
        autoprefixer(),
      ],
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    hmr: {
      clientPort: 5000,
    },
  },
  build: {
    outDir: "dist",
  },
});
