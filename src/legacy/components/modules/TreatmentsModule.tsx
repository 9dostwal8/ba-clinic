// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, Edit2, Trash2, Save, X, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { useCurrency } from '../../hooks/useCurrency';

interface TreatmentType {
  id: string;
  name: string;
  name_ar: string;
  category: string;
  description: string;
  description_ar: string;
  cost: number;
  duration_minutes: number;
  is_active: boolean;
}

export function TreatmentsModule() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    category: 'filling',
    description: '',
    description_ar: '',
    cost: '',
    duration_minutes: '30',
  });

  const handleSearch = async () => {
    if (!profile?.clinic_id) return;
    if (!searchTerm.trim() && filterCategory === 'all') return;

    setLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('treatment_types')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,name_ar.ilike.%${searchTerm}%`);
      }

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTreatmentTypes(data || []);
    } catch (error) {
      console.error('Error searching treatment types:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTreatmentTypes = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('treatment_types')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTreatmentTypes(data || []);
    } catch (error) {
      console.error('Error loading treatment types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;

    try {
      const treatmentData = {
        clinic_id: profile.clinic_id,
        name: formData.name,
        name_ar: formData.name_ar || null,
        category: formData.category,
        description: formData.description || null,
        description_ar: formData.description_ar || null,
        cost: parseFloat(formData.cost),
        duration_minutes: parseInt(formData.duration_minutes),
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from('treatment_types')
          .update(treatmentData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('treatment_types').insert(treatmentData);
        if (error) throw error;
      }

      await loadTreatmentTypes();
      resetForm();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (type: TreatmentType) => {
    setEditingId(type.id);
    setFormData({
      name: type.name,
      name_ar: type.name_ar || '',
      category: type.category,
      description: type.description || '',
      description_ar: type.description_ar || '',
      cost: type.cost.toString(),
      duration_minutes: type.duration_minutes.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this treatment type?')) return;

    try {
      const { error } = await supabase
        .from('treatment_types')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      await loadTreatmentTypes();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      category: 'filling',
      description: '',
      description_ar: '',
      cost: '',
      duration_minutes: '30',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      filling: 'bg-blue-100 text-blue-800',
      extraction: 'bg-red-100 text-red-800',
      surgery: 'bg-purple-100 text-purple-800',
      root_canal: 'bg-green-100 text-green-800',
      cleaning: 'bg-green-100 text-green-800',
      whitening: 'bg-yellow-100 text-yellow-800',
      braces: 'bg-pink-100 text-pink-800',
      crown: 'bg-indigo-100 text-indigo-800',
      implant: 'bg-teal-100 text-teal-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      filling: 'Filling',
      extraction: 'Extraction',
      surgery: 'Surgery',
      root_canal: 'Root Canal',
      cleaning: 'Cleaning',
      whitening: 'Whitening',
      braces: 'Braces',
      crown: 'Crown',
      implant: 'Implant',
      other: 'Other',
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('treatment_types_pricing')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="sm:inline">{t('add_treatment_type')}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder={t('search_treatment_types')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || (!searchTerm.trim() && filterCategory === 'all')}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
            >
              {loading ? t('searching') : t('search')}
            </button>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="all">{t('allCategories')}</option>
            <option value="filling">{t('filling')}</option>
            <option value="extraction">{t('extraction')}</option>
            <option value="surgery">{t('surgery')}</option>
            <option value="root_canal">{t('rootCanal')}</option>
            <option value="cleaning">{t('cleaning')}</option>
            <option value="whitening">{t('whitening')}</option>
            <option value="braces">{t('braces')}</option>
            <option value="crown">{t('crown')}</option>
            <option value="implant">{t('implant')}</option>
            <option value="other">{t('other')}</option>
          </select>
        </div>
      </div>

      {!hasSearched && treatmentTypes.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <Stethoscope className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{t('searchForTreatments')}</h3>
          <p className="text-sm sm:text-base text-gray-600">{t('enterSearchTermOrSelectCategory')}</p>
        </div>
      )}

      {hasSearched && treatmentTypes.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <div className="text-gray-400 mb-2 text-5xl">🔍</div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">{t('noResultsFound')}</h3>
          <p className="text-sm sm:text-base text-gray-600">{t('tryDifferentSearchTerm')}</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                  {editingId ? t('edit_treatment_type') : t('add_new_treatment_type')}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('treatment_name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('treatment_name_arabic')}
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      <option value="filling">{t('filling')}</option>
                      <option value="extraction">{t('extraction')}</option>
                      <option value="surgery">{t('surgery')}</option>
                      <option value="root_canal">{t('rootCanal')}</option>
                      <option value="cleaning">{t('cleaning')}</option>
                      <option value="whitening">{t('whitening')}</option>
                      <option value="braces">{t('braces')}</option>
                      <option value="crown">{t('crown')}</option>
                      <option value="implant">{t('implant')}</option>
                      <option value="other">{t('other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('cost_iqd')} *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('duration_minutes')} *
                    </label>
                    <input
                      type="number"
                      required
                      min="5"
                      step="5"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      {t('description_arabic')}
                    </label>
                    <textarea
                      dir="rtl"
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm sm:text-base order-1"
                  >
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    {editingId ? t('update') : t('create')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 sm:px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base order-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {treatmentTypes.length > 0 && (
        <div className="grid gap-3 sm:gap-4">
          {treatmentTypes.map((type) => (
            <div
              key={type.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{type.name}</h3>
                    {type.name_ar && (
                      <span className="text-sm sm:text-base text-gray-600 break-words" dir="rtl">
                        ({type.name_ar})
                      </span>
                    )}
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadge(
                        type.category
                      )}`}
                    >
                      {getCategoryLabel(type.category)}
                    </span>
                  </div>
                  {(type.description || type.description_ar) && (
                    <div className="text-xs sm:text-sm text-gray-600 mb-2 break-words">
                      {type.description}
                      {type.description_ar && (
                        <span className="ml-2" dir="rtl">
                          ({type.description_ar})
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <span>{t('duration')}: {type.duration_minutes} {t('minutes')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                  <div className="text-left sm:text-right">
                    <div className="text-xl sm:text-2xl font-bold text-sky-600 whitespace-nowrap">
                      {parseFloat(type.cost.toString()).toLocaleString()} {currencySymbol}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => handleEdit(type)}
                      className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      aria-label="Edit"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
