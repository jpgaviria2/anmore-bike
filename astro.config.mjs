// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://jpgaviria2.github.io',
  base: '/anmore-bike/',
  vite: {
    plugins: [tailwindcss()]
  }
});