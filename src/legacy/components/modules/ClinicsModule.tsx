// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase, Clinic } from '../../lib/supabase';
import { Plus, Edit, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { useCurrency } from '../../hooks/useCurrency';
import { createClinicAdminAccount } from '@/lib/accounts.functions';


interface BillingModel {
  id: string;
  model_name: string;
  billing_type: 'per_treatment' | 'per_patient';
  default_price_per_unit: number;
  currency: string;
  description: string;
}

interface ClinicType {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  subscription_plan_id: string;
  billing_model_id: string;
  subscription_plans?: {
    display_name: string;
    price_monthly: number;
  };
  billing_models?: {
    model_name: string;
    default_price_per_unit: number;
  };
}

export function ClinicsModule() {
  const { t } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [billingModels, setBillingModels] = useState<BillingModel[]>([]);
  const [clinicTypes, setClinicTypes] = useState<ClinicType[]>([]);
  const [newClinic, setNewClinic] = useState({
    name: '',
    name_ar: '',
    address: '',
    phone: '',
    email: '',
    subscription_end: '',
    max_staff: 10,
    max_patients: 1000,
    clinic_type_id: '',
    admin_full_name: '',
    admin_email: '',
    admin_password: '',
    admin_phone: ''
  });

  const [editingClinic, setEditingClinic] = useState<any>(null);

  useEffect(() => {
    loadClinics();
    loadBillingModels();
    loadClinicTypes();
  }, []);

  const loadClinics = async () => {
    try {
      const { data } = await supabase
        .from('clinics')
        .select('*, clinic_type_id')
        .order('created_at', { ascending: false });

      setClinics(data || []);
    } catch (error) {
      console.error('Error loading clinics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBillingModels = async () => {
    try {
      const { data } = await supabase
        .from('billing_models')
        .select('*')
        .eq('is_active', true)
        .order('model_name');

      setBillingModels(data || []);
    } catch (error) {
      console.error('Error loading billing models:', error);
    }
  };

  const loadClinicTypes = async () => {
    try {
      const { data: types } = await supabase
        .from('clinic_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (!types) {
        setClinicTypes([]);
        return;
      }

      const typesWithDetails = await Promise.all(
        types.map(async (type) => {
          let billingModel = null;
          if (type.billing_model_id) {
            const { data: bm } = await supabase
              .from('billing_models')
              .select('model_name, default_price_per_unit')
              .eq('id', type.billing_model_id)
              .maybeSingle();
            billingModel = bm;
          }
          return {
            ...type,
            billing_models: billingModel
          };
        })
      );

      setClinicTypes(typesWithDetails);
    } catch (error) {
      console.error('Error loading clinic types:', error);
    }
  };

  const handleClinicTypeChange = (clinicTypeId: string) => {
    setNewClinic({
      ...newClinic,
      clinic_type_id: clinicTypeId
    });
  };

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const clinicData: any = {
        name: newClinic.name,
        name_ar: newClinic.name_ar || null,
        address: newClinic.address || null,
        phone: newClinic.phone || null,
        email: newClinic.email || null,
        max_staff: newClinic.max_staff || 10,
        max_patients: newClinic.max_patients || 1000,
        clinic_type_id: newClinic.clinic_type_id || null
      };

      // Only include subscription_end if provided, otherwise let trigger set 15-day trial
      if (newClinic.subscription_end) {
        clinicData.subscription_end = new Date(newClinic.subscription_end).toISOString();
      }
      // subscription_status, subscription_start are set automatically by trigger

      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .insert(clinicData)
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Always create billing settings for new clinics
      let billingModelId = null;

      if (newClinic.clinic_type_id) {
        const selectedType = clinicTypes.find(ct => ct.id === newClinic.clinic_type_id);
        billingModelId = selectedType?.billing_model_id || null;
      }

      // If no billing model from clinic type, get the default one
      if (!billingModelId) {
        const { data: defaultModel } = await supabase
          .from('billing_models')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        billingModelId = defaultModel?.id;
      }

      // Create billing settings
      if (billingModelId) {
        const { error: billingError } = await supabase
          .from('clinic_billing_settings')
          .insert({
            clinic_id: clinic.id,
            billing_model_id: billingModelId,
            is_active: true
          });

        if (billingError) {
          console.error('Error setting billing model:', billingError);
        }
      }


      await createClinicAdminAccount({
        data: {
          clinic_id: clinic.id,
          email: newClinic.admin_email.trim(),
          password: newClinic.admin_password,
          full_name: newClinic.admin_full_name.trim(),
          phone: newClinic.admin_phone || null
        }
      });

      setShowAddModal(false);
      setNewClinic({
        name: '',
        name_ar: '',
        address: '',
        phone: '',
        email: '',
        subscription_end: '',
        max_staff: 10,
        max_patients: 1000,
        clinic_type_id: '',
        admin_full_name: '',
        admin_email: '',
        admin_password: '',
        admin_phone: ''
      });
      loadClinics();
      alert(
        `Clinic created!\n\nClinic admin login:\nEmail: ${newClinic.admin_email}\nPassword: (as provided)\n\nThe clinic admin can now create dentist and reception accounts.`
      );
    } catch (error: any) {
      console.error('Error adding clinic:', error);
      alert(`Error adding clinic: ${error?.message || 'Please try again.'}`);
    }

  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ subscription_status: status })
        .eq('id', id);

      if (error) throw error;
      loadClinics();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleEditClinic = async (clinic: Clinic) => {
    const { data: billingSettings } = await supabase
      .from('clinic_billing_settings')
      .select('billing_model_id, custom_price_per_unit')
      .eq('clinic_id', clinic.id)
      .eq('is_active', true)
      .maybeSingle();

    setEditingClinic({
      ...clinic,
      subscription_end: clinic.subscription_end ? new Date(clinic.subscription_end).toISOString().split('T')[0] : '',
      clinic_type_id: (clinic as any).clinic_type_id || '',
      billing_model_id: billingSettings?.billing_model_id || '',
      custom_price_per_unit: billingSettings?.custom_price_per_unit?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic) return;

    try {
      const updateData: any = {
        name: editingClinic.name,
        name_ar: editingClinic.name_ar || null,
        phone: editingClinic.phone || null,
        email: editingClinic.email || null,
        address: editingClinic.address || null,
        subscription_end: editingClinic.subscription_end ? new Date(editingClinic.subscription_end).toISOString() : null,
        max_staff: editingClinic.max_staff || 10,
        max_patients: editingClinic.max_patients || 1000,
        clinic_type_id: editingClinic.clinic_type_id || null,
        updated_at: new Date().toISOString()
      };

      const { error: clinicError } = await supabase
        .from('clinics')
        .update(updateData)
        .eq('id', editingClinic.id);

      if (clinicError) throw clinicError;

      if (editingClinic.clinic_type_id) {
        const selectedType = clinicTypes.find(ct => ct.id === editingClinic.clinic_type_id);
        if (selectedType?.billing_model_id) {
          const { data: existingSettings } = await supabase
            .from('clinic_billing_settings')
            .select('id')
            .eq('clinic_id', editingClinic.id)
            .maybeSingle();

          if (existingSettings) {
            const { error: updateError } = await supabase
              .from('clinic_billing_settings')
              .update({
                billing_model_id: selectedType.billing_model_id,
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSettings.id);

            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('clinic_billing_settings')
              .insert({
                clinic_id: editingClinic.id,
                billing_model_id: selectedType.billing_model_id,
                is_active: true
              });

            if (insertError) throw insertError;
          }
        }
      }

      setShowEditModal(false);
      setEditingClinic(null);
      loadClinics();
      alert('Clinic updated successfully!');
    } catch (error) {
      console.error('Error updating clinic:', error);
      alert('Error updating clinic. Please try again.');
    }
  };

  if (loading) return <div className="text-center py-12">Loading clinics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t('clinics_management')}</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          <span>{t('add_clinic')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinics.map((clinic) => (
          <div key={clinic.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{clinic.name}</h3>
                {clinic.name_ar && (
                  <p className="text-sm text-gray-600">{clinic.name_ar}</p>
                )}
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  clinic.subscription_status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : clinic.subscription_status === 'suspended'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {clinic.subscription_status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div>{clinic.phone}</div>
              <div>{clinic.email}</div>
              <div>{clinic.address}</div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm">
                <span className="text-gray-600">Expires:</span>{' '}
                <span className="font-medium">
                  {clinic.subscription_end
                    ? new Date(clinic.subscription_end).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditClinic(clinic)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {clinic.subscription_status !== 'active' && (
                  <button
                    onClick={() => updateStatus(clinic.id, 'active')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Activate"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {clinic.subscription_status === 'active' && (
                  <button
                    onClick={() => updateStatus(clinic.id, 'suspended')}
                    className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                    title="Suspend"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{t('add_new_clinic')}</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddClinic} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClinic.name}
                    onChange={(e) => setNewClinic({ ...newClinic, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={newClinic.name_ar}
                    onChange={(e) => setNewClinic({ ...newClinic, name_ar: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Type *
                  </label>
                  <select
                    required
                    value={newClinic.clinic_type_id}
                    onChange={(e) => handleClinicTypeChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select clinic type...</option>
                    {clinicTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.max_dentists} dentist(s) ({type.billing_models?.model_name || 'No billing model'})
                      </option>
                    ))}
                  </select>
                  {newClinic.clinic_type_id && (() => {
                    const selectedType = clinicTypes.find(ct => ct.id === newClinic.clinic_type_id);
                    return selectedType ? (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <p className="text-green-800">
                          <strong>Clinic Type:</strong> {selectedType.name}
                        </p>
                        <p className="text-green-700 text-xs mt-1">
                          {selectedType.description}
                        </p>
                        {selectedType.billing_models && (
                          <p className="text-green-800 mt-2">
                            <strong>Billing Model:</strong> {selectedType.billing_models.model_name}
                            ({formatNumber(selectedType.billing_models.default_price_per_unit)} {currencySymbol} per unit)
                          </p>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('phone')}</label>
                  <input
                    type="tel"
                    value={newClinic.phone}
                    onChange={(e) => setNewClinic({ ...newClinic, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
                  <input
                    type="email"
                    value={newClinic.email}
                    onChange={(e) => setNewClinic({ ...newClinic, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('address')}</label>
                  <input
                    type="text"
                    value={newClinic.address}
                    onChange={(e) => setNewClinic({ ...newClinic, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription End Date
                  </label>
                  <input
                    type="date"
                    value={newClinic.subscription_end}
                    onChange={(e) => setNewClinic({ ...newClinic, subscription_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Staff
                  </label>
                  <input
                    type="number"
                    value={newClinic.max_staff}
                    onChange={(e) => setNewClinic({ ...newClinic, max_staff: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-gray-900">Clinic Admin Account</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    This login owns the clinic and can create its own dentists and receptionists.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      required
                      placeholder="Admin full name *"
                      value={newClinic.admin_full_name}
                      onChange={(e) => setNewClinic({ ...newClinic, admin_full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="tel"
                      placeholder="Admin phone"
                      value={newClinic.admin_phone}
                      onChange={(e) => setNewClinic({ ...newClinic, admin_phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Admin login email *"
                      value={newClinic.admin_email}
                      onChange={(e) => setNewClinic({ ...newClinic, admin_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="text"
                      required
                      minLength={8}
                      placeholder="Temporary password (min 8 chars) *"
                      value={newClinic.admin_password}
                      onChange={(e) => setNewClinic({ ...newClinic, admin_password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>


              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
                >
                  Add Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingClinic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit Clinic</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingClinic(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateClinic} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingClinic.name}
                    onChange={(e) => setEditingClinic({ ...editingClinic, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={editingClinic.name_ar}
                    onChange={(e) => setEditingClinic({ ...editingClinic, name_ar: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('phone')}</label>
                  <input
                    type="tel"
                    value={editingClinic.phone}
                    onChange={(e) => setEditingClinic({ ...editingClinic, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
                  <input
                    type="email"
                    value={editingClinic.email}
                    onChange={(e) => setEditingClinic({ ...editingClinic, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('address')}</label>
                  <input
                    type="text"
                    value={editingClinic.address}
                    onChange={(e) => setEditingClinic({ ...editingClinic, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription End Date
                  </label>
                  <input
                    type="date"
                    value={editingClinic.subscription_end}
                    onChange={(e) => setEditingClinic({ ...editingClinic, subscription_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Staff
                  </label>
                  <input
                    type="number"
                    value={editingClinic.max_staff}
                    onChange={(e) => setEditingClinic({ ...editingClinic, max_staff: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinic Type
                  </label>
                  <select
                    value={editingClinic.clinic_type_id || ''}
                    onChange={(e) => {
                      const selectedType = clinicTypes.find(ct => ct.id === e.target.value);
                      if (selectedType) {
                        setEditingClinic({
                          ...editingClinic,
                          clinic_type_id: e.target.value,
                          billing_model_id: selectedType.billing_model_id || ''
                        });
                      } else {
                        setEditingClinic({
                          ...editingClinic,
                          clinic_type_id: '',
                          billing_model_id: ''
                        });
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select clinic type...</option>
                    {clinicTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.max_dentists} dentist(s) ({type.billing_models?.model_name || 'No billing model'})
                      </option>
                    ))}
                  </select>
                  {editingClinic.clinic_type_id && (() => {
                    const selectedType = clinicTypes.find(ct => ct.id === editingClinic.clinic_type_id);
                    return selectedType ? (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                        <p className="text-green-800">
                          <strong>Clinic Type:</strong> {selectedType.name}
                        </p>
                        <p className="text-green-700 text-xs mt-1">
                          {selectedType.description}
                        </p>
                        {selectedType.billing_models && (
                          <p className="text-green-800 mt-2">
                            <strong>Billing Model:</strong> {selectedType.billing_models.model_name}
                            ({formatNumber(selectedType.billing_models.default_price_per_unit)} {currencySymbol} per unit)
                          </p>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingClinic(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
                >
                  Update Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
