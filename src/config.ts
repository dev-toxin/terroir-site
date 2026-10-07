/**
 * Единственное место для «параметров сайта» (аналог params в hugo.toml).
 * Меняйте здесь — всё остальное подхватит.
 */
export const SITE = {
  /** Канонический адрес (без www, см. docs/DECISIONS.md → D07). */
  url: 'https://terroir-app.com',
  name: 'Terroir',
  /** Единый контакт: письма, mailto-форма, Privacy/Terms, JSON-LD. */
  contact: 'contact@ankosoftlab.com',
  company: {
    name: 'AnKo Software Labs',
    url: 'https://www.ankosoftlab.com/',
    /** Юрисдикция оператора: ИП в Грузии (решение 2026-10-07). */
    country: 'Georgia',
    /** Регистрационный номер ИП в реестре NAPR — публикуем (открыт в реестре). */
    id: '304822565',
  },
  /** Оператор сайта и сервиса: подвал, Privacy/Terms, JSON-LD (решение 2026-10-07). */
  operator: {
    en: 'Individual Entrepreneur Anton Kozyrev (Georgia), ID 304822565, trading as AnKo Software Labs',
    ru: 'Индивидуальный предприниматель Антон Козырев (Грузия), ИН 304822565, AnKo Software Labs',
    legalName: 'Individual Entrepreneur Anton Kozyrev',
  },
  form: {
    /**
     * Куда отправлять заявки раннего доступа.
     * Пусто → форма собирает письмо и открывает почтовый клиент (mailto:contact). Так сейчас.
     * Задано → обычный POST туда. Только своя Cloudflare Pages Function + D1 после переезда
     * на Cloudflare; сторонние сервисы форм не используем (решение 2026-10-07).
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
