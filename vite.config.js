import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The hero ("The Great Assessor") is the LCP element, but it is imported from
// JS, so the browser's preload scanner never sees it -- it can only start
// downloading after the bundle has arrived, parsed and rendered. That was
// ~6.7s of the 18.8s mobile LCP, spent doing nothing.
//
// Vite content-hashes the filename at build time, so the URL cannot be written
// into index.html by hand. This finds the emitted asset and injects the
// preload, which puts the request in flight alongside the bundle instead of
// after it.
function preloadHero() {
  const SOURCE = 'great-assessor'
  return {
    name: 'preload-hero-image',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const hero = Object.keys(ctx.bundle ?? {}).find(
          (f) => f.startsWith('assets/' + SOURCE) && f.endsWith('.webp'),
        )
        if (!hero) {
          // Renaming or moving the asset must not silently drop the preload.
          throw new Error(
            `[preload-hero-image] no built asset matching assets/${SOURCE}*.webp - ` +
              `update SOURCE in vite.config.js to match the renamed hero.`,
          )
        }
        return [
          {
            tag: 'link',
            attrs: { rel: 'preload', as: 'image', href: '/' + hero, fetchpriority: 'high' },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadHero()],
})
