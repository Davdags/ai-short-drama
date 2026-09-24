import { defineRouting } from 'next-intl/routing';

// Content/task locales — prompts and jobs stay bilingual internally.
export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

// Locales the website is served in (English only).
export const uiLocales = ['en'] as const;

export const routing = defineRouting({
    // 支持的所有语言
    locales: uiLocales,

    // 默认语言
    defaultLocale: 'en',

    // URL 路径策略: 始终显示语言前缀
    localePrefix: 'always'
});
