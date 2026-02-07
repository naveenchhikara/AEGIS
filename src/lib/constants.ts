export const LANGUAGES = {
  en: { code: 'en', name: 'English', label: 'EN' },
  hi: { code: 'hi', name: 'हिंदी', label: 'HI' },
  mr: { code: 'mr', name: 'मराठी', label: 'MR' },
  gu: { code: 'gu', name: 'ગુજરાતી', label: 'GU' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const APP_NAME = 'AEGIS';
export const APP_TAGLINE = 'UCB Internal Audit & Compliance Platform';
