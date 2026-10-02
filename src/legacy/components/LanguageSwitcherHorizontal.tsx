// @ts-nocheck
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSwitcherHorizontal() {
  const { language, setLanguage, availableLanguages } = useLanguage();

  const enabledLanguages = availableLanguages.filter(lang => lang.isEnabled);

  if (enabledLanguages.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {enabledLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code as 'en' | 'ar' | 'ckb')}
          className={`min-w-[80px] px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 ${
            language === lang.code
              ? 'bg-teal-100 text-teal-900 shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300'
          }`}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
}
