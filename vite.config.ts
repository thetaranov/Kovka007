import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // УБРАЛИ БЛОК CSS/POSTCSS ОТСЮДА
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
