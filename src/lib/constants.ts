export const LANGUAGES = {
  en: { code: 'en', name: 'English', flag: '🇬🇧' },
  hi: { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  mr: { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  gu: { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const APP_NAME = 'AEGIS';
export const APP_TAGLINE = 'UCB Internal Audit & Compliance Platform';
