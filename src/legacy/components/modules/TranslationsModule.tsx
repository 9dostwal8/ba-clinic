// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Languages, Save, X, Globe, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface TranslationItem {
  keyId: string;
  key: string;
  en: string;
  ar: string;
}

const PAGE_SIZE = 50;

export function TranslationsModule() {
  const { profile } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ en: string; ar: string }>({ en: '', ar: '' });
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTranslations();
  }, [currentPage, searchTerm]);

  const loadTranslations = async () => {
    try {
      setLoading(true);

      let countQuery = supabase
        .from('translation_keys')
        .select('*', { count: 'exact', head: true });

      let keysQuery = supabase
        .from('translation_keys')
        .select('id, key_name')
        .order('key_name');

      if (searchTerm) {
        countQuery = countQuery.ilike('key_name', `%${searchTerm}%`);
        keysQuery = keysQuery.ilike('key_name', `%${searchTerm}%`);
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      keysQuery = keysQuery.range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      const { data: keys, error } = await keysQuery;

      if (error) throw error;

      if (!keys || keys.length === 0) {
        setTranslations([]);
        setLoading(false);
        return;
      }

      const keyIds = keys.map(k => k.id);
      const { data: trans } = await supabase
        .from('translations')
        .select('key_id, language_code, translated_text')
        .in('key_id', keyIds);

      const translationsMap: { [keyId: string]: TranslationItem } = {};

      keys.forEach(key => {
        const enTranslation = trans?.find(t => t.key_id === key.id && t.language_code === 'en')?.translated_text || '';
        const arTranslation = trans?.find(t => t.key_id === key.id && t.language_code === 'ar')?.translated_text || '';

        translationsMap[key.id] = {
          keyId: key.id,
          key: key.key_name,
          en: enTranslation,
          ar: arTranslation
        };
      });

      setTranslations(Object.values(translationsMap));
    } catch (error) {
      console.error('Error loading translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: TranslationItem) => {
    setEditingKey(item.key);
    setEditValues({ en: item.en, ar: item.ar });
  };

  const handleSave = async () => {
    if (!editingKey) return;

    try {
      setSaving(true);

      const currentItem = translations.find(t => t.key === editingKey);
      if (!currentItem) {
        alert('Translation key not found');
        return;
      }

      await supabase
        .from('translations')
        .upsert([
          {
            key_id: currentItem.keyId,
            language_code: 'en',
            translated_text: editValues.en
          },
          {
            key_id: currentItem.keyId,
            language_code: 'ar',
            translated_text: editValues.ar
          }
        ], { onConflict: 'key_id,language_code' });

      await loadTranslations();
      setEditingKey(null);
      alert('Translation updated successfully');
    } catch (error) {
      console.error('Error saving translation:', error);
      alert('Failed to save translation');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValues({ en: '', ar: '' });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!profile || profile.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Access denied. Super admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <p className="mt-4 text-gray-600">Loading translations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Languages className="w-8 h-8 text-sky-600" />
          <h1 className="text-3xl font-bold text-gray-900">{t('translations_management')}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            <Globe className="w-5 h-5" />
            <span>{language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}</span>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by key name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(0);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of {totalCount} translations
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{t('key')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{t('english')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">{t('arabic')}</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {translations.map((item) => (
                <tr key={item.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-700">{item.key}</span>
                  </td>
                  <td className="px-6 py-4">
                    {editingKey === item.key ? (
                      <input
                        type="text"
                        value={editValues.en}
                        onChange={(e) => setEditValues({ ...editValues, en: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-gray-900">{item.en}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingKey === item.key ? (
                      <input
                        type="text"
                        value={editValues.ar}
                        onChange={(e) => setEditValues({ ...editValues, ar: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-right"
                        dir="rtl"
                      />
                    ) : (
                      <span className="text-gray-900" dir="rtl">{item.ar}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      {editingKey === item.key ? (
                        <>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title={t('save')}
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition disabled:opacity-50"
                            title={t('cancel')}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {translations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200 mt-6">
          <Languages className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t('no_translations_found')}</p>
        </div>
      )}
    </div>
  );
}
