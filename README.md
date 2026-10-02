# terroir-site

Маркетинговый сайт **Terroir** — личного винного помощника с памятью (погреб, вкус, кухня).
Статический, многостраничный, EN (корень `/`) + RU (`/ru/`). Делает студия [AnKo Software Labs](https://www.ankosoftlab.com/).

- Стек: **Astro 7** (static output), собственные компоненты и CSS, без UI-фреймворков. JS ≈ 2 КБ, сайт работает без JS.
- Хостинг: **Cloudflare Pages** (см. [`docs/DEPLOY.md`](docs/DEPLOY.md)). ⚠️ Живой сайт пока на GitHub Pages из `main` — работа ведётся в ветке `site-v2`, **не мёржить в `main` до переключения хостинга**.
- Решения и их причины: [`docs/DECISIONS.md`](docs/DECISIONS.md). Бренд: [`docs/BRAND.md`](docs/BRAND.md).
- Старый одностраничный лендинг сохранён в [`legacy/index.html`](legacy/index.html) (в сборку не попадает).

## Запуск

Нужен Node 22 (системный node на этой машине — 18, поэтому сначала nvm):

```bash
source ~/.nvm/nvm.sh && nvm use        # читает .nvmrc → 22
npm ci                                 # зависимости только локально
npm run dev                            # http://localhost:4321  (и /ru/)
```

Сборка и проверка:

```bash
npm run build      # → dist/
npm run preview    # отдать dist/ на :4321
npm run check      # сборка + контраст AA + ссылки/мета/hreflang/h1/JSON-LD/CSP/вес страниц
```

`scripts/shot.sh /ru/ 360` — скриншот страницы в headless Chrome (нужен запущенный `preview`).

## Структура

```
astro.config.mjs        i18n (en по умолчанию без префикса, ru в /ru/), sitemap, локализованная 404
src/config.ts           ВСЕ параметры сайта: url, contact, company, form.endpoint, analytics
src/i18n/{en,ru}.ts     строки интерфейса (меню, футер, форма, 18+); ui.ts — localize(), ROUTES, NAV
src/layouts/Base.astro  <head>: title/description/canonical/hreflang/OG/Twitter/JSON-LD, шапка, подвал, 18+
src/components/         Header, Footer, Logo, Icon (свои SVG), BottleLabel, CellarMockup, EarlyAccessForm, …
src/content-pages/      тела страниц: каждая принимает lang и содержит EN и RU тексты рядом
src/pages/              маршруты: *.astro (EN) и ru/*.astro (RU) — однострочные обёртки
src/styles/global.css   дизайн-токены (custom properties), типографика, сетка, кнопки, карточки
src/assets/brand/       logo.svg, mark.svg (источник логотипа), og-*.svg (исходники OG)
src/assets/fonts/       Cormorant + Inter (woff2, SIL OFL) — Vite добавляет хэш в имя
public/                 _headers, _redirects, CNAME, favicon*, icon-*, site.webmanifest, og/*.png, fonts/OFL-*.txt
scripts/                check.sh/check.mjs (самопроверка), contrast.mjs, build-brand.mjs, shot.sh
legacy/                 старый лендинг
docs/                   DECISIONS, DEPLOY, BRAND, sessions/
```

## Как заменить логотип

1. Заменить **два файла**: `src/assets/brand/logo.svg` (вордмарк) и `src/assets/brand/mark.svg` (знак).
   Используйте `fill="currentColor"`/`stroke="currentColor"` — цвет задаёт CSS (тёмная и светлая версии автоматически).
2. Всё на сайте берёт логотип только через `src/components/Logo.astro` — больше ничего менять не нужно.
3. Favicon, иконки PWA и OG-картинки: либо положить свои файлы в `public/` (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og/og-en.png`, `og/og-ru.png`), либо поправить `markFavicon()`/`og()` в `scripts/build-brand.mjs` и запустить `node scripts/build-brand.mjs`.

Подробнее — `docs/BRAND.md`.

## Как добавить страницу

1. Создать `src/content-pages/MyPage.astro` по образцу `About.astro`: объект `C = { en: {...}, ru: {...} }[lang]`, обёртка `<Base lang title description path crumb>`.
2. Добавить маршрут в `ROUTES` (`src/i18n/ui.ts`) и, если нужно, в `NAV`; подпись — в `nav` обоих словарей `src/i18n/en.ts` / `ru.ts`.
3. Создать обёртки `src/pages/my-page.astro` (`<Page lang="en" />`) и `src/pages/ru/my-page.astro` (`<Page lang="ru" />`).
4. `npm run check` — проверит уникальность title/description, hreflang и ссылки.

## Как добавить перевод (новый язык)

1. `astro.config.mjs` → `i18n.locales` и `sitemap.i18n.locales`; `src/config.ts` → `Lang`, `LANGS`.
2. Новый словарь `src/i18n/<lang>.ts` (тип проверяется по `en.ts`), подключить в `ui.ts`; обновить `localize()`/`stripLang()` и переключатель языка в `Header.astro` (сейчас он рассчитан на пару EN/RU).
3. Добавить ветку `<lang>` в объекты `C` во всех `src/content-pages/*.astro` и обёртки в `src/pages/<lang>/`.
4. Добавить `hreflang` в `Base.astro`.

## Параметры (src/config.ts)

| Параметр | Сейчас | Что делает |
|---|---|---|
| `contact` | `ceo@ankosoftlab.com` | все mailto, форма, Privacy/Terms, JSON-LD |
| `form.endpoint` | `''` | пусто → заявка письмом (mailto); URL → POST туда |
| `analytics.enabled` | `false` | Cloudflare Web Analytics (см. DEPLOY.md §6) |
| `url` | `https://terroir-app.com` | canonical, hreflang, sitemap, OG |
