// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config.ts';
import { renameSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Cloudflare Pages serves the nearest `404.html` up the path. With `build.format: 'directory'`
 * Astro emits /ru/404/index.html — move it to /ru/404.html so /ru/* misses get the RU page.
 */
const localized404 = {
  name: 'terroir:localized-404',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const root = fileURLToPath(dir);
      const from = `${root}ru/404/index.html`;
      if (existsSync(from)) {
        renameSync(from, `${root}ru/404.html`);
        rmSync(`${root}ru/404`, { recursive: true, force: true });
      }
    },
  },
};

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  output: 'static',
  compressHTML: true,
  build: {
    format: 'directory',
    // Стили всегда внешним файлом (с хэшем) — так CSP обходится без 'unsafe-inline'.
    inlineStylesheets: 'never',
    assets: '_astro',
  },
  vite: {
    build: {
      // Не инлайнить шрифты/картинки в CSS как data: — пусть кэшируются отдельно.
      assetsInlineLimit: 0,
    },
  },
  devToolbar: { enabled: false },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    localized404,
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru' },
      },
    }),
  ],
});
