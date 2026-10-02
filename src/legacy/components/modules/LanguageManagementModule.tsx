// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Languages, Globe, Check, X, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSetting {
  id: string;
  language_code: string;
  language_name: string;
  is_enabled: boolean;
  is_rtl: boolean;
  created_at: string;
  updated_at: string;
}

export function LanguageManagementModule() {
  const { t } = useLanguage();
  const [languages, setLanguages] = useState<LanguageSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('language_settings')
        .select('*')
        .order('language_code');

      if (error) throw error;
      setLanguages(data || []);
    } catch (error) {
      console.error('Error loading languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = async (languageId: string, currentState: boolean) => {
    try {
      setSaving(languageId);
      const { error } = await supabase
        .from('language_settings')
        .update({ is_enabled: !currentState })
        .eq('id', languageId);

      if (error) throw error;

      setLanguages(languages.map(lang =>
        lang.id === languageId ? { ...lang, is_enabled: !currentState } : lang
      ));
    } catch (error) {
      console.error('Error updating language:', error);
      alert('Failed to update language setting');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Languages className="w-8 h-8 text-sky-600" />
            <span>{t('languageManagement')}</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Enable or disable languages for all users in the system
          </p>
        </div>
        <button
          onClick={loadLanguages}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-5 h-5" />
          <span>{t('refresh')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {languages.map((language) => (
          <div
            key={language.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  language.is_enabled ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  <Globe className={`w-6 h-6 ${
                    language.is_enabled ? 'text-emerald-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {language.language_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {language.language_code.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-sm text-gray-600">{t('rtlSupport')}</span>
                <span className={`text-sm font-medium ${
                  language.is_rtl ? 'text-sky-600' : 'text-gray-400'
                }`}>
                  {language.is_rtl ? t('yes') : t('no')}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-sm text-gray-600">{t('status')}</span>
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  language.is_enabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {language.is_enabled ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>{t('enabled')}</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" />
                      <span>{t('disabled')}</span>
                    </>
                  )}
                </span>
              </div>

              <button
                onClick={() => toggleLanguage(language.id, language.is_enabled)}
                disabled={saving === language.id}
                className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                  language.is_enabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving === language.id ? (
                  <span className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('saving')}</span>
                  </span>
                ) : language.is_enabled ? (
                  t('disable')
                ) : (
                  t('enable')
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {languages.length === 0 && (
        <div className="text-center py-12">
          <Languages className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No languages configured</p>
        </div>
      )}
    </div>
  );
}
