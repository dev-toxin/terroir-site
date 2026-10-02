/**
 * Единственное место для «параметров сайта» (аналог params в hugo.toml).
 * Меняйте здесь — всё остальное подхватит.
 */
export const SITE = {
  /** Канонический адрес (без www, см. docs/DECISIONS.md → D07). */
  url: 'https://terroir-app.com',
  name: 'Terroir',
  /** Единый контакт: письма, mailto-форма, Privacy/Terms, JSON-LD. */
  contact: 'ceo@ankosoftlab.com',
  company: {
    name: 'AnKo Software Labs',
    url: 'https://www.ankosoftlab.com/',
    /** Юрисдикция оператора — ТРЕБУЕТ ПОДТВЕРЖДЕНИЯ Антоном (см. Privacy/Terms). */
    country: 'Georgia',
  },
  form: {
    /**
     * Куда отправлять заявки раннего доступа.
     * Пусто → форма собирает письмо и открывает почтовый клиент (mailto:contact).
     * Задано (например, https://formspree.io/f/xxxx или Cloudflare Worker) → обычный POST туда.
     * Не забудьте добавить домен endpoint в form-action в public/_headers.
     */
    endpoint: '',
  },
  analytics: {
    /** Cloudflare Web Analytics. Выключено. Включение — docs/DEPLOY.md, раздел «Аналитика». */
    enabled: false,
    token: '',
  },
} as const;

export type Lang = 'en' | 'ru';
export const LANGS: Lang[] = ['en', 'ru'];
