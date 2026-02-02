import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Sous Chef',
        short_name: 'Sous Chef',
        description: 'Your personal recipe manager',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['food', 'lifestyle', 'utilities'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'apple-touch-icon-180x180.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
        screenshots: [
          {
            src: 'screenshot-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Sous Chef Desktop View',
          },
          {
            src: 'screenshot-narrow.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Sous Chef Mobile View',
          },
        ],
      },
      workbox: {
        // Precache app shell files
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        // Skip waiting to activate new service worker immediately
        skipWaiting: true,
        clientsClaim: true,
        // Navigation fallback for SPA
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Cache-first for static assets (JS, CSS, fonts)
          {
            urlPattern: /\.(?:js|css|woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Cache-first for SQL WASM files
          {
            urlPattern: /sql\.js.*\.wasm$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sql-wasm',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Stale-while-revalidate for recipe photos
          {
            urlPattern: /\/photos\//i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'recipe-photos',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Stale-while-revalidate for external images
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|heic|heif)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'external-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Network-first for API calls (if any)
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
            },
          },
        ],
      },
      // Development options
      devOptions: {
        enabled: false, // Disable in dev to avoid caching issues
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@services': path.resolve(__dirname, './src/services'),
      '@db': path.resolve(__dirname, './src/db'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  optimizeDeps: {
    // sql.js is loaded via script tag, not as an ES module
    // so we don't need to exclude it from optimization
  },
  // Handle CommonJS modules that don't have proper ES module exports
  esbuild: {
    // Ensure sql.js is handled correctly
    supported: {
      'top-level-await': true,
    },
  },
  build: {
    target: 'ES2022',
    // Enable minification for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Enable source maps for debugging (can be disabled for smaller builds)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // Code splitting configuration for better caching
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Vendor chunks - rarely change, cache well
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-state': ['zustand', '@tanstack/react-query'],
          'vendor-db': ['idb'],  // sql.js is loaded via script tag
          // Feature chunks - group related functionality
          'feature-planning': [
            './src/routes/PlanningView.tsx',
            './src/routes/BrainstormView.tsx',
            './src/routes/SueChatView.tsx',
            './src/routes/RecommendationsView.tsx',
          ],
          'feature-cooking': [
            './src/routes/CookingView.tsx',
            './src/routes/CookMode.tsx',
            './src/routes/MealPrepView.tsx',
          ],
          'feature-recipe': [
            './src/routes/RecipeDetail.tsx',
            './src/routes/RecipeEditor.tsx',
            './src/routes/RecipeImport.tsx',
            './src/routes/RecipeHistory.tsx',
          ],
        },
        // Asset file naming for better caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    // Report compressed size
    reportCompressedSize: true,
  },
  // Performance optimizations for dev server
  server: {
    // Enable HTTP/2 for better performance
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  // Preview server configuration
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
  },
});
