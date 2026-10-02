// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/config.ts';

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
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru' },
      },
    }),
  ],
});
