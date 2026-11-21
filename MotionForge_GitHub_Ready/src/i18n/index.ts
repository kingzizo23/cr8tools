import { create } from 'zustand';
import { en, Translations } from './en';
import { ar } from './ar';

export type Language = 'en' | 'ar';

interface I18nStore {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useI18n = create<I18nStore>((set) => ({
  language: 'ar', // Default to Arabic as requested in prompt, with instant English switch
  t: ar,
  setLanguage: (lang) => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    set({ language: lang, t: lang === 'ar' ? ar : en });
  },
  toggleLanguage: () => {
    set((state) => {
      const nextLang: Language = state.language === 'ar' ? 'en' : 'ar';
      document.documentElement.lang = nextLang;
      document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
      return { language: nextLang, t: nextLang === 'ar' ? ar : en };
    });
  },
}));
