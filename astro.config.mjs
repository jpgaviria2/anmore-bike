// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// Support different base paths for GitHub Pages vs Hostinger
const isHostinger = process.env.DEPLOY_TARGET === 'hostinger';

// https://astro.build/config
export default defineConfig({
  site: isHostinger ? 'https://anmore.bike' : 'https://jpgaviria2.github.io',
  base: isHostinger ? '/' : '/anmore-bike/',
  vite: {
    plugins: [tailwindcss()]
  }
});