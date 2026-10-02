// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, Save, X, AlertCircle, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_digits: number;
  exchange_rate_to_usd: number;
  is_active: boolean;
  is_custom: boolean;
  created_at: string;
}

interface Clinic {
  id: string;
  name: string;
  currency_id?: string;
}

interface CurrencySetting {
  clinic_id: string;
  currency_id: string;
  clinic_name?: string;
  currency_code?: string;
}

export default function CurrencyManagementModule() {
  const { t } = useLanguage();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [currencySettings, setCurrencySettings] = useState<CurrencySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    decimal_digits: 2,
    exchange_rate_to_usd: 1.0,
    is_active: true,
  });

  useEffect(() => {
    fetchCurrencies();
    fetchClinics();
    fetchCurrencySettings();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .order('is_custom', { ascending: true })
        .order('code', { ascending: true });

      if (error) throw error;
      setCurrencies(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, currency_id')
        .order('name');

      if (error) throw error;
      setClinics(data || []);
    } catch (err: any) {
      console.error('Error fetching clinics:', err);
    }
  };

  const fetchCurrencySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_currency_settings')
        .select(`
          clinic_id,
          currency_id,
          clinics (name),
          currencies (code)
        `);

      if (error) throw error;
      setCurrencySettings(data?.map((item: any) => ({
        clinic_id: item.clinic_id,
        currency_id: item.currency_id,
        clinic_name: item.clinics?.name,
        currency_code: item.currencies?.code,
      })) || []);
    } catch (err: any) {
      console.error('Error fetching currency settings:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.code || !formData.name || !formData.symbol) {
      setError(t('all_fields_required'));
      return;
    }

    if (formData.exchange_rate_to_usd <= 0) {
      setError(t('exchange_rate_must_be_positive'));
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('currencies')
          .update({
            code: formData.code.toUpperCase(),
            name: formData.name,
            symbol: formData.symbol,
            decimal_digits: formData.decimal_digits,
            exchange_rate_to_usd: formData.exchange_rate_to_usd,
            is_active: formData.is_active,
          })
          .eq('id', editingId);

        if (error) throw error;
        setSuccess(t('currency_updated'));
      } else {
        const { error } = await supabase
          .from('currencies')
          .insert([{
            code: formData.code.toUpperCase(),
            name: formData.name,
            symbol: formData.symbol,
            decimal_digits: formData.decimal_digits,
            exchange_rate_to_usd: formData.exchange_rate_to_usd,
            is_active: formData.is_active,
            is_custom: true,
          }]);

        if (error) throw error;
        setSuccess(t('currency_added'));
      }

      resetForm();
      fetchCurrencies();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (currency: Currency) => {
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      decimal_digits: currency.decimal_digits,
      exchange_rate_to_usd: currency.exchange_rate_to_usd,
      is_active: currency.is_active,
    });
    setEditingId(currency.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    const currency = currencies.find(c => c.id === id);
    const isInUse = currencySettings.some(cs => cs.currency_id === id);

    if (isInUse) {
      setError(t('cannot_delete_currency_in_use'));
      return;
    }

    if (currency && !currency.is_custom) {
      setError(t('cannot_delete_default_currency'));
      return;
    }

    if (!confirm(t('confirm_delete'))) return;

    try {
      const { error } = await supabase
        .from('currencies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess(t('currency_deleted'));
      fetchCurrencies();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('currencies')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchCurrencies();
      setSuccess(t('currency_updated'));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetClinicCurrency = async (clinicId: string, currencyId: string) => {
    try {
      const existingSetting = currencySettings.find(cs => cs.clinic_id === clinicId);

      if (existingSetting) {
        const { error } = await supabase
          .from('clinic_currency_settings')
          .update({ currency_id: currencyId, updated_at: new Date().toISOString() })
          .eq('clinic_id', clinicId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clinic_currency_settings')
          .insert([{ clinic_id: clinicId, currency_id: currencyId }]);

        if (error) throw error;
      }

      setSuccess(t('clinic_currency_updated'));
      fetchCurrencySettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      symbol: '',
      decimal_digits: 2,
      exchange_rate_to_usd: 1.0,
      is_active: true,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const defaultCurrencies = currencies.filter(c => !c.is_custom);
  const customCurrencies = currencies.filter(c => c.is_custom);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-800">{t('currency_management')}</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          {showAddForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showAddForm ? t('cancel') : t('add_currency')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">
            {editingId ? t('edit_currency') : t('add_currency')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('currency_code')} *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="USD, EUR, SAR"
                maxLength={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{t('currency_code_required')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('currency_name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="US Dollar"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('currency_symbol')} *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="$"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('decimal_digits')}
              </label>
              <input
                type="number"
                value={formData.decimal_digits}
                onChange={(e) => setFormData({ ...formData, decimal_digits: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                max="4"
              />
              <p className="text-xs text-gray-500 mt-1">{t('decimal_digits_info')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('exchange_rate_to_usd')} *
              </label>
              <input
                type="number"
                step="0.00000001"
                value={formData.exchange_rate_to_usd}
                onChange={(e) => setFormData({ ...formData, exchange_rate_to_usd: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{t('exchange_rate_info')}</p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">{t('is_active')}</span>
              </label>
            </div>

            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {t('save')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            {t('default_currencies')}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {defaultCurrencies.map((currency) => (
              <div
                key={currency.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{currency.code}</span>
                    <span className="text-gray-600">({currency.symbol})</span>
                    {!currency.is_active && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        {t('inactive')}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{currency.name}</div>
                  <div className="text-xs text-gray-500">
                    1 USD = {(1 / currency.exchange_rate_to_usd).toFixed(currency.decimal_digits)} {currency.code}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(currency.id, currency.is_active)}
                    className={`px-3 py-1 rounded text-sm ${
                      currency.is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {currency.is_active ? t('active') : t('activate')}
                  </button>
                  <button
                    onClick={() => handleEdit(currency)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">{t('custom_currencies')}</h3>
          {customCurrencies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('no_custom_currencies')}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {customCurrencies.map((currency) => (
                <div
                  key={currency.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{currency.code}</span>
                      <span className="text-gray-600">({currency.symbol})</span>
                      {!currency.is_active && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          {t('inactive')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">{currency.name}</div>
                    <div className="text-xs text-gray-500">
                      1 USD = {(1 / currency.exchange_rate_to_usd).toFixed(currency.decimal_digits)} {currency.code}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(currency.id, currency.is_active)}
                      className={`px-3 py-1 rounded text-sm ${
                        currency.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {currency.is_active ? t('active') : t('activate')}
                    </button>
                    <button
                      onClick={() => handleEdit(currency)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(currency.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">{t('clinic_currency_settings')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">{t('clinic_name')}</th>
                <th className="text-left py-3 px-4">{t('current_currency')}</th>
                <th className="text-left py-3 px-4">{t('select_currency')}</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => {
                const currentSetting = currencySettings.find(cs => cs.clinic_id === clinic.id);
                return (
                  <tr key={clinic.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{clinic.name}</td>
                    <td className="py-3 px-4">
                      {currentSetting?.currency_code || t('not_set')}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={currentSetting?.currency_id || ''}
                        onChange={(e) => handleSetClinicCurrency(clinic.id, e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                      >
                        <option value="">{t('select_currency')}</option>
                        {currencies.filter(c => c.is_active).map((currency) => (
                          <option key={currency.id} value={currency.id}>
                            {currency.code} - {currency.name} ({currency.symbol})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
