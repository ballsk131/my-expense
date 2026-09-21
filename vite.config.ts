import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "รายจ่ายของฉัน",
        short_name: "รายจ่าย",
        description: "บันทึกรายจ่ายจากรูปใบเสร็จ อ่านตัวเลขให้อัตโนมัติ",
        lang: "th",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fbfcfc",
        theme_color: "#0f6b73",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // The OCR core ships three wasm variants but a device downloads exactly
        // one, so they are cached on first use rather than precached.
        globPatterns: ["**/*.{css,html,svg,png,woff2}", "assets/**/*.js"],
        runtimeCaching: [
          {
            // The app's own copies of the Tesseract worker, wasm core and (when
            // bundled) language data. Immutable once fetched.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith("/tesseract/"),
            handler: "CacheFirst",
            options: {
              cacheName: "ocr-core",
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Without `npm run fetch:langdata` the language data comes from the
            // public CDN on first scan; cache it so later scans work offline.
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|tessdata\.projectnaptha\.com)\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "ocr-langdata",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
