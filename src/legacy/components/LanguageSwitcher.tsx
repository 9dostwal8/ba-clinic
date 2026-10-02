// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Languages, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const enabledLanguages = availableLanguages.filter(lang => lang.isEnabled);

  if (enabledLanguages.length <= 1) {
    return null;
  }

  const currentLanguage = enabledLanguages.find(lang => lang.code === language);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition flex items-center space-x-2"
        title="Switch Language"
      >
        <Languages className="w-5 h-5" />
        {currentLanguage && (
          <span className="text-sm font-medium">{currentLanguage.name}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {enabledLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code as 'en' | 'ar' | 'ckb');
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition flex items-center justify-between ${
                language === lang.code ? 'bg-sky-50 text-sky-700' : 'text-gray-700'
              }`}
            >
              <span className="font-medium">{lang.name}</span>
              {language === lang.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
