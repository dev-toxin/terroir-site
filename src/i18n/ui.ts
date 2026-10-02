import type { Lang } from '../config';
import { en } from './en';
import { ru } from './ru';

export const dict = { en, ru } as const;
export type Dict = typeof en;

export function t(lang: Lang): Dict {
  return dict[lang];
}

/** Путь страницы с учётом языка: localize('ru', '/features/') → '/ru/features/'. */
export function localize(lang: Lang, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return lang === 'en' ? clean : `/ru${clean === '/' ? '/' : clean}`;
}

/** Убирает языковой префикс: '/ru/faq/' → '/faq/'. */
export function stripLang(pathname: string): string {
  const p = pathname.replace(/^\/ru(?=\/|$)/, '');
  return p === '' ? '/' : p;
}

/** Ключи страниц → путь без языкового префикса. Используются в меню, крошках, футере. */
export const ROUTES = {
  home: '/',
  features: '/features/',
  how: '/how-it-works/',
  for: '/for/',
  early: '/early-access/',
  faq: '/faq/',
  about: '/about/',
  privacy: '/privacy/',
  terms: '/terms/',
} as const;
export type RouteKey = keyof typeof ROUTES;

export const NAV: RouteKey[] = ['features', 'how', 'for', 'faq', 'about'];
