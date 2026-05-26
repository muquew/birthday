import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/xingxing/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/xingxing/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
