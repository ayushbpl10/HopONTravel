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

const initI18n = async () => {
  let savedLanguage: string | null = null;

  if (typeof window !== 'undefined') {
    try {
      savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    } catch (e) {}
  }

  if (!savedLanguage) {
    let deviceLocale = 'en';
    if (typeof window !== 'undefined') {
      try {
        deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
      } catch (e) {}
    }
    savedLanguage = Object.keys(resources).includes(deviceLocale) ? deviceLocale : 'en';
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      compatibilityJSON: 'v3',
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
