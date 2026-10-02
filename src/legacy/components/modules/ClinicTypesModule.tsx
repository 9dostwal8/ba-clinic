// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Plus, Edit, Save, X, Trash2, Users, DollarSign, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';

interface ClinicType {
  id: string;
  name: string;
  description: string;
  min_dentists: number;
  max_dentists: number;
  min_receptionists: number;
  max_receptionists: number;
  min_cleaners: number;
  max_cleaners: number;
  min_workers: number;
  max_workers: number;
  subscription_plan_id: string | null;
  billing_model_id: string | null;
  billing_per_treatment: number;
  billing_per_patient: number;
  is_active: boolean;
  display_order: number;
}

interface SubscriptionPlan {
  id: string;
  plan_name: string;
  billing_mode: string | null;
  price_monthly: number | null;
  unit_price: number | null;
  currency: string | null;
  is_active: boolean;
}


export default function ClinicTypesModule() {
  const { t } = useLanguage();
  const [clinicTypes, setClinicTypes] = useState<ClinicType[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<ClinicType>>({
    name: '',
    description: '',
    min_dentists: 1,
    max_dentists: 2,
    min_receptionists: 1,
    max_receptionists: 1,
    min_cleaners: 0,
    max_cleaners: 1,
    min_workers: 0,
    max_workers: 0,
    subscription_plan_id: null,
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesRes, plansRes] = await Promise.all([
        supabase
          .from('clinic_types')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('subscription_plans')
          .select('id, plan_name, billing_mode, price_monthly, unit_price, currency, is_active')
          .eq('is_active', true)
          .order('plan_name', { ascending: true })
      ]);

      if (typesRes.data) setClinicTypes(typesRes.data);
      if (plansRes.data) setSubscriptionPlans(plansRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const planRateLabel = (plan: SubscriptionPlan) => {
    const currency = plan.currency || 'IQD';
    if (plan.billing_mode === 'per_treatment') {
      return `${formatNumber(Number(plan.unit_price || 0))} ${currency} / treatment`;
    }
    if (plan.billing_mode === 'per_patient') {
      return `${formatNumber(Number(plan.unit_price || 0))} ${currency} / patient`;
    }
    return `${formatNumber(Number(plan.price_monthly || 0))} ${currency} / month`;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from('clinic_types')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('clinic_types')
          .insert([formData]);

        if (error) throw error;
        setShowAddForm(false);
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving clinic type:', error);
      alert(error.message || 'Error saving clinic type');
    }
  };

  const handleEdit = (clinicType: ClinicType) => {
    setFormData(clinicType);
    setEditingId(clinicType.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('clinicTypes.confirmDelete') || 'Are you sure you want to delete this clinic type?')) return;

    try {
      const { error } = await supabase
        .from('clinic_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Error deleting clinic type:', error);
      alert(error.message || 'Cannot delete clinic type. It may be in use by existing clinics.');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('clinic_types')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling clinic type status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      min_dentists: 1,
      max_dentists: 2,
      min_receptionists: 1,
      max_receptionists: 1,
      min_cleaners: 0,
      max_cleaners: 1,
      min_workers: 0,
      max_workers: 0,
      subscription_plan_id: null,
      is_active: true,
      display_order: 0,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const getBillingModelName = (clinicType: ClinicType) => {
    const plan = subscriptionPlans.find(p => p.id === clinicType.subscription_plan_id);
    return plan ? plan.plan_name : 'No subscription plan';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">{t('common.loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-purple-600" />
            {t('clinicTypes.title') || 'Clinic Types Management'}
          </h2>
          <p className="text-gray-600 mt-1">
            {t('clinicTypes.description') || 'Configure clinic types with staff limits and billing models'}
          </p>
        </div>
        {!showAddForm && !editingId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-5 h-5" />
            {t('clinicTypes.addNew') || 'Add Clinic Type'}
          </button>
        )}
      </div>

      {(showAddForm || editingId) && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border-2 border-purple-500">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {editingId ? (
              <>
                <Edit className="w-5 h-5" />
                {t('clinicTypes.editType') || 'Edit Clinic Type'}
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                {t('clinicTypes.addNew') || 'Add New Clinic Type'}
              </>
            )}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('clinicTypes.name') || 'Type Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Clinic, Poly Clinic"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('clinicTypes.displayOrder') || 'Display Order'} *
                </label>
                <input
                  type="number"
                  required
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('clinicTypes.description') || 'Description'}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={2}
                placeholder="Brief description of this clinic type"
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('clinicTypes.staffLimits') || 'Staff Limits'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium mb-2">
                    {t('clinicTypes.dentists') || 'Dentists'}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Min</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.min_dentists}
                        onChange={(e) => setFormData({ ...formData, min_dentists: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Max</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.max_dentists}
                        onChange={(e) => setFormData({ ...formData, max_dentists: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium mb-2">
                    {t('clinicTypes.receptionists') || 'Receptionists'}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Min</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.min_receptionists}
                        onChange={(e) => setFormData({ ...formData, min_receptionists: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Max</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.max_receptionists}
                        onChange={(e) => setFormData({ ...formData, max_receptionists: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium mb-2">
                    {t('clinicTypes.cleaners') || 'Cleaners'}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Min</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.min_cleaners}
                        onChange={(e) => setFormData({ ...formData, min_cleaners: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Max</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.max_cleaners}
                        onChange={(e) => setFormData({ ...formData, max_cleaners: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg">
                  <label className="block text-sm font-medium mb-2">
                    {t('clinicTypes.workers') || 'Workers'}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Min</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.min_workers}
                        onChange={(e) => setFormData({ ...formData, min_workers: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Max</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.max_workers}
                        onChange={(e) => setFormData({ ...formData, max_workers: parseInt(e.target.value) })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Default Subscription Plan
              </h4>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  Clinic types no longer have their own rates. Pick one of the subscription plans you manage in the
                  Subscriptions section — new clinics of this type get that plan automatically, and pricing always
                  follows the subscription assigned by the super admin.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Select Subscription Plan</label>
                <select
                  value={formData.subscription_plan_id || ''}
                  onChange={(e) => setFormData({ ...formData, subscription_plan_id: e.target.value || null })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- No default plan --</option>
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan_name} ({planRateLabel(plan)})
                    </option>
                  ))}
                </select>
              </div>
            </div>


            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                {t('clinicTypes.isActive') || 'Active (Available for clinics to select)'}
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                <Save className="w-4 h-4" />
                {editingId ? (t('common.update') || 'Update') : (t('common.create') || 'Create')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                <X className="w-4 h-4" />
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {clinicTypes.map((type) => (
          <div
            key={type.id}
            className={`bg-white rounded-lg shadow-md p-4 md:p-6 border-l-4 ${
              type.is_active ? 'border-purple-500' : 'border-gray-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-xl font-bold">{type.name}</h3>
                  {type.is_active ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {t('clinicTypes.active') || 'Active'}
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {t('clinicTypes.inactive') || 'Inactive'}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {getBillingModelName(type)}
                  </span>
                </div>
                <p className="text-gray-600">{type.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(type)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title={t('common.edit') || 'Edit'}
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleToggleActive(type.id, type.is_active)}
                  className={`p-2 rounded-lg transition ${
                    type.is_active
                      ? 'text-yellow-600 hover:bg-yellow-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  title={type.is_active ? (t('clinicTypes.deactivate') || 'Deactivate') : (t('clinicTypes.activate') || 'Activate')}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title={t('common.delete') || 'Delete'}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('clinicTypes.staffLimits') || 'Staff Limits'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('clinicTypes.dentists') || 'Dentists'}:</span>
                    <span className="font-medium">{type.min_dentists} - {type.max_dentists}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('clinicTypes.receptionists') || 'Receptionists'}:</span>
                    <span className="font-medium">{type.min_receptionists} - {type.max_receptionists}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('clinicTypes.cleaners') || 'Cleaners'}:</span>
                    <span className="font-medium">{type.min_cleaners} - {type.max_cleaners}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('clinicTypes.workers') || 'Workers'}:</span>
                    <span className="font-medium">{type.min_workers} - {type.max_workers}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Default Subscription
                </h4>
                <div className="space-y-2 text-sm">
                  {(() => {
                    const plan = subscriptionPlans.find(p => p.id === type.subscription_plan_id);
                    if (!plan) {
                      return <div className="text-gray-500 text-center py-2">No subscription plan assigned</div>;
                    }
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plan:</span>
                          <span className="font-medium">{plan.plan_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Billing:</span>
                          <span className="font-medium">{planRateLabel(plan)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>

      {clinicTypes.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {t('clinicTypes.noTypes') || 'No Clinic Types'}
          </h3>
          <p className="text-gray-500 mb-4">
            {t('clinicTypes.noTypesDescription') || 'Create your first clinic type to get started'}
          </p>
        </div>
      )}
    </div>
  );
}
