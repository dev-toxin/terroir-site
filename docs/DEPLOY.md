# Деплой на Cloudflare Pages

> ⚠️ **Не пушить `site-v2` в `main`, пока хостинг не переключён.**
> Сейчас www.terroir-app.com отдаётся **GitHub Pages из корня `main`** (`index.html` + `CNAME`).
> В ветке `site-v2` в корне больше нет `index.html` (он в `legacy/`), а сайт — это исходники Astro.
> Если смёржить её в `main` до переключения, GitHub Pages покажет 404 на живом домене.

Вся работа лежит в локальной ветке **`site-v2`**. Ничего не запушено.

---

## 0. Что получится

| Параметр | Значение |
|---|---|
| Фреймворк | Astro 7 (статическая сборка), Node 22 |
| Build command | `npm ci && npm run build` (или просто `npm run build` — Pages сам делает `npm ci`) |
| Output directory | `dist` |
| Root directory | `/` (корень репозитория) |
| Production branch | `main` (после переключения) — до этого можно деплоить превью из `site-v2` |
| Переменные окружения | `NODE_VERSION=22` (Pages также читает `.nvmrc`) |
| Заголовки / редиректы | `public/_headers`, `public/_redirects` → попадают в `dist/` |
| Канонический домен | `https://terroir-app.com` (apex), `www` → 301 на apex |

> В брифе указаны `hugo --gc --minify` и `HUGO_VERSION=0.167.0` — это на случай Hugo. Выбран Astro (см. `docs/DECISIONS.md`, D02), поэтому `HUGO_VERSION` не нужен. Если когда-нибудь вернётесь к Hugo — build `hugo --gc --minify`, output `public`, env `HUGO_VERSION=0.167.0`.

---

## 1. Создать проект Pages (без простоя, сайт пока на GitHub Pages)

1. Запушить ветку **`site-v2`** (не `main`!): `git push -u origin site-v2`.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → выбрать репозиторий `terroir-site`.
3. Настройки сборки:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables (Production и Preview): `NODE_VERSION` = `22`
4. Production branch пока поставить **`site-v2`** (или оставить `main` и смотреть превью `site-v2.<project>.pages.dev`).
5. Дождаться сборки, открыть `https://<project>.pages.dev/` и `/ru/` — проверить (чек-лист ниже).

## 2. Проверка на `*.pages.dev` до переключения домена

- `curl -I https://<project>.pages.dev/` — есть `content-security-policy`, `strict-transport-security`, `x-content-type-options`.
- `curl -I https://<project>.pages.dev/_astro/<любой файл>` — `cache-control: public, max-age=31536000, immutable`.
- `https://<project>.pages.dev/ru/nope` → русская 404; `/nope` → английская 404.
- `/index.html` → 301 на `/`.
- Chrome DevTools → Lighthouse (Mobile + Desktop), цель ≥ 95 по всем четырём категориям.

## 3. Переключение домена

DNS домена сейчас в **Namecheap** (по данным брифа). Два варианта:

### Вариант A (рекомендуется): перенести DNS-зону в Cloudflare
1. Cloudflare → **Add a site** → `terroir-app.com` → Free plan. Cloudflare импортирует текущие записи — проверить, что все записи (почта: MX/TXT/SPF/DKIM, если есть) на месте.
2. Пока **не** менять NS. Сначала в проекте Pages → **Custom domains → Set up a domain** → `terroir-app.com`, затем `www.terroir-app.com`. Cloudflare сам создаст CNAME-записи на `<project>.pages.dev`.
3. В Namecheap → Domain List → `terroir-app.com` → **Nameservers → Custom DNS** → вписать два NS Cloudflare. *(Это только описание — агент ничего в Namecheap не делал.)*
4. Пока NS распространяются (минуты–часы), старые записи на GitHub Pages продолжают работать → простоя нет: часть посетителей видит старый сайт, часть — новый.
5. Redirect www → apex: Cloudflare → домен → **Rules → Redirect Rules → Create rule** →
   - When: Hostname equals `www.terroir-app.com`
   - Then: Dynamic redirect, expression `concat("https://terroir-app.com", http.request.uri.path)`, status **301**, preserve query string ✓.
   (`_redirects` в Pages не умеет матчить по хосту, поэтому правило — на уровне зоны.)
6. SSL/TLS → режим **Full (strict)**, «Always Use HTTPS» ✓.

### Вариант B: оставить DNS в Namecheap
1. В Pages → Custom domains добавить `www.terroir-app.com` → Cloudflare покажет CNAME-цель `<project>.pages.dev`.
2. В Namecheap → Advanced DNS → у записи `www` поменять цель с `<user>.github.io` на `<project>.pages.dev`.
3. Apex `terroir-app.com` на Pages без DNS в Cloudflare подключить нельзя (нужен CNAME flattening). Поэтому при варианте B канонический домен лучше сделать **www**: поменять `SITE.url` в `src/config.ts` на `https://www.terroir-app.com`, а apex перенаправить URL Redirect-записью в Namecheap.

## 4. После переключения

1. Смёржить `site-v2` в `main` (fast-forward/merge — история сохранена), production branch в Pages → `main`.
2. В GitHub → Settings → Pages → **Unpublish / Source: None**, чтобы GitHub Pages перестал отдавать старый сайт. Файл `CNAME` можно оставить — Cloudflare его игнорирует (в `dist/` он тоже попадает, это безвредно); удалять его не обязательно.
3. Google Search Console: добавить домен, отправить `https://terroir-app.com/sitemap-index.xml`.

## 5. Форма раннего доступа

Сейчас `SITE.form.endpoint = ''` → форма открывает почтовый клиент с готовым письмом на `ceo@ankosoftlab.com`. Чтобы принимать заявки на сервере:
1. Завести endpoint (Formspree, Tally, свой Cloudflare Worker/Pages Function).
2. Вписать URL в `src/config.ts` → `SITE.form.endpoint`.
3. В `public/_headers` добавить origin в `form-action` (например `form-action 'self' https://formspree.io`).
4. Пересобрать. Форма будет делать обычный POST (`application/x-www-form-urlencoded`) с полями `email, language, cellar, wish, consent`.

## 6. Аналитика (выключена)

Cloudflare Web Analytics не требует cookies. Включение:
1. Cloudflare → Web Analytics → Add site → получить token. (Для сайтов на Pages можно просто включить в настройках проекта — тогда скрипт внедрит Cloudflare, шаги 2–3 не нужны, но CSP всё равно надо расширить.)
2. `src/config.ts`: `analytics.enabled = true`, `analytics.token = '<token>'`.
3. `public/_headers`: `script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com`.
4. Обновить раздел «На этом сайте» в Privacy.

## 7. CI

`.github/workflows/build.yml` собирает сайт и запускает `scripts/check.mjs` на каждый push/PR (файл создан, ни разу не запускался). Деплой делает Cloudflare Pages сам — в Actions деплоя нет.
