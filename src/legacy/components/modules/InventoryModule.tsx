// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Save, X, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { useCurrency } from '../../hooks/useCurrency';

interface InventoryItem {
  id: string;
  item_name: string;
  item_name_ar: string;
  category: string;
  sku: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  unit_cost: number;
  supplier: string;
  expiry_date: string;
  created_at: string;
}

export function InventoryModule() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    item_name: '',
    item_name_ar: '',
    category: 'medications',
    sku: '',
    quantity: '0',
    unit: 'piece',
    reorder_level: '10',
    unit_cost: '0',
    supplier: '',
    expiry_date: '',
  });

  useEffect(() => {
    if (profile?.clinic_id) {
      loadItems();
    }
  }, [profile?.clinic_id]);

  const loadItems = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('item_name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;

    try {
      const itemData = {
        clinic_id: profile.clinic_id,
        item_name: formData.item_name,
        item_name_ar: formData.item_name_ar || null,
        category: formData.category,
        sku: formData.sku || null,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        reorder_level: parseInt(formData.reorder_level),
        unit_cost: parseFloat(formData.unit_cost),
        supplier: formData.supplier || null,
        expiry_date: formData.expiry_date || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_items').insert(itemData);
        if (error) throw error;
      }

      await loadItems();
      resetForm();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormData({
      item_name: item.item_name,
      item_name_ar: item.item_name_ar || '',
      category: item.category,
      sku: item.sku || '',
      quantity: item.quantity.toString(),
      unit: item.unit,
      reorder_level: item.reorder_level.toString(),
      unit_cost: item.unit_cost.toString(),
      supplier: item.supplier || '',
      expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      await loadItems();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      item_name_ar: '',
      category: 'medications',
      sku: '',
      quantity: '0',
      unit: 'piece',
      reorder_level: '10',
      unit_cost: '0',
      supplier: '',
      expiry_date: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name_ar?.includes(searchTerm) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const lowStockItems = items.filter((item) => item.quantity <= item.reorder_level);

  const getCategoryBadge = (category: string) => {
    const colors = {
      medications: 'bg-blue-100 text-blue-800',
      equipment: 'bg-green-100 text-green-800',
      supplies: 'bg-purple-100 text-purple-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('inventory_management')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 md:p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900 text-sm md:text-base">{t('low_stock_alert')}</h3>
              <p className="text-xs md:text-sm text-yellow-800">
                {lowStockItems.length} item(s) are running low and need reordering
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('search_items_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm md:text-base"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="all">{t('all_categories')}</option>
            <option value="medications">{t('medications')}</option>
            <option value="equipment">{t('equipment')}</option>
            <option value="supplies">{t('expense_category_supplies')}</option>
          </select>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('item_name_arabic')}</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={formData.item_name_ar}
                      onChange={(e) => setFormData({ ...formData, item_name_ar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      <option value="medications">{t('medications')}</option>
                      <option value="equipment">{t('equipment')}</option>
                      <option value="supplies">{t('expense_category_supplies')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('sku_code')}</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('quantity')} *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('unit')} *</label>
                    <input
                      type="text"
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder={t('unit_placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('reorder_level')} *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('unit_cost_iqd')} *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('supplier')}</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('expiry_date')}</label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {editingId ? t('update') : t('create')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('no_inventory_items')}</h3>
            <p className="text-gray-600">{t('start_adding_items_description')}</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isLowStock = item.quantity <= item.reorder_level;
            const totalValue = item.quantity * parseFloat(item.unit_cost.toString());

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border p-4 md:p-6 hover:shadow-md transition-shadow ${
                  isLowStock ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900">{item.item_name}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.item_name_ar && (
                          <span className="text-sm text-gray-600" dir="rtl">
                            ({item.item_name_ar})
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadge(item.category)}`}>
                          {item.category}
                        </span>
                        {isLowStock && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            {t('low_stock')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 text-xs md:text-sm">
                      {item.sku && (
                        <div>
                          <span className="text-gray-600">SKU:</span>
                          <div className="font-medium text-gray-900 break-all">{item.sku}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Stock:</span>
                        <div className={`font-medium ${isLowStock ? 'text-yellow-700' : 'text-gray-900'}`}>
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Reorder:</span>
                        <div className="font-medium text-gray-900">{item.reorder_level}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Cost:</span>
                        <div className="font-medium text-gray-900">{parseFloat(item.unit_cost.toString()).toLocaleString()} {currencySymbol}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Value:</span>
                        <div className="font-medium text-sky-600">{formatNumber(totalValue)} {currencySymbol}</div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-600 mt-3">
                      {item.supplier && <span>Supplier: {item.supplier}</span>}
                      {item.expiry_date && (
                        <span className="text-red-600 font-medium">
                          Expires: {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
