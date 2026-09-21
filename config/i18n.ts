import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';
import kn from '../locales/kn.json';

const LANGUAGE_KEY = 'app_language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  mr: { translation: mr },
  kn: { translation: kn },
};

export const detectLocationLanguage = (): { lang: 'en' | 'hi' | 'mr' | 'kn'; isRegional: boolean; regionName: string } => {
  try {
    const locale = Localization.getLocales()[0];
    const langCode = locale?.languageCode?.toLowerCase() || '';
    const region = locale?.regionCode?.toUpperCase() || '';

    if (langCode === 'mr' || region === 'IN-MH' || region === 'MH') {
      return { lang: 'mr', isRegional: true, regionName: 'Maharashtra' };
    }
    if (langCode === 'kn' || region === 'IN-KA' || region === 'KA') {
      return { lang: 'kn', isRegional: true, regionName: 'Karnataka' };
    }
    if (langCode === 'hi') {
      return { lang: 'en', isRegional: false, regionName: 'India' }; // Per user: show in English for rest of Indian states
    }
  } catch (_) {}
  return { lang: 'en', isRegional: false, regionName: 'Other' };
};

const initI18n = async () => {
  let savedLanguage: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    } catch (e) {}
  }

  if (!savedLanguage) {
    const geo = detectLocationLanguage();
    savedLanguage = geo.lang;
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage || 'en',
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
    });
};

initI18n();

export default i18n;

export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
};
