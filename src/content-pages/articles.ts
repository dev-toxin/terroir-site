/**
 * Journal articles. Each article = slug + en/ru metadata; the body lives in
 * src/content-pages/articles/<Slug>.astro (takes `lang`). Add a new entry here and a route in
 * src/pages/journal/[slug].astro picks it up automatically.
 */
export const ARTICLES = [
  {
    slug: 'drinking-window',
    published: '2026-10-02',
    en: {
      title: 'How to read a drinking window',
      description: 'What “drink 2022–2031” actually means, why the best years are a band and not a date, and what to do with the bottle you’ve been saving.',
      date: '2 October 2026',
      minutes: '5 min read',
    },
    ru: {
      title: 'Как читать окно питья',
      description: 'Что на самом деле значит «пить 2022–2031», почему лучшие годы — это полоса, а не дата, и что делать с бутылкой, которую жалко открывать.',
      date: '2 октября 2026',
      minutes: '5 минут',
    },
  },
] as const;
