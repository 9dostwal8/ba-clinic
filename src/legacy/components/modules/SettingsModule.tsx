// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Save, Building2, FileText, Palette, MessageSquare, ArrowRight, Edit2, X, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomTemplateDesigner from './CustomTemplateDesigner';

interface Clinic {
  id: string;
  name: string;
  name_ar: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  clinic_type_id: string | null;
}

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
  billing_per_treatment: number;
  billing_per_patient: number;
  display_order: number;
}

interface SettingsModuleProps {
  onNavigate?: (page: string) => void;
}

export function SettingsModule({ onNavigate }: SettingsModuleProps = {}) {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCustomTemplateDesigner, setShowCustomTemplateDesigner] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [currentClinicType, setCurrentClinicType] = useState<ClinicType | null>(null);
  const [availableClinicTypes, setAvailableClinicTypes] = useState<ClinicType[]>([]);
  const [showClinicTypeModal, setShowClinicTypeModal] = useState(false);
  const [selectedClinicType, setSelectedClinicType] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (profile?.clinic_id) {
      loadClinic();
      loadCustomTemplates();
      loadClinicTypes();
    }
  }, [profile?.clinic_id]);

  const loadClinic = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('clinics')
        .select(`
          *,
          clinic_types(*)
        `)
        .eq('id', profile.clinic_id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setClinic(data);
        setFormData({
          name: data.name,
          name_ar: data.name_ar || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
        });
        if (data.clinic_types) {
          setCurrentClinicType(data.clinic_types as unknown as ClinicType);
        }
      }
    } catch (error) {
      console.error('Error loading clinic:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClinicTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAvailableClinicTypes(data || []);
    } catch (error) {
      console.error('Error loading clinic types:', error);
    }
  };

  const loadCustomTemplates = async () => {
    if (!profile?.clinic_id) return;

    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .eq('use_custom_template', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomTemplates(data || []);
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: formData.name,
          name_ar: formData.name_ar || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
        })
        .eq('id', profile.clinic_id);

      if (error) throw error;
      await loadClinic();
      alert('Clinic settings updated successfully!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClinicTypeUpdate = async () => {
    if (!profile?.clinic_id || !selectedClinicType) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          clinic_type_id: selectedClinicType,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.clinic_id);

      if (error) throw error;

      await loadClinic();
      setShowClinicTypeModal(false);
      setSelectedClinicType(null);
      alert('Clinic type updated successfully! Billing calculations will be updated accordingly.');
    } catch (error: any) {
      console.error('Error updating clinic type:', error);
      alert('Error updating clinic type: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{t('clinic_settings')}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-6 h-6 text-sky-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('clinic_information')}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('clinic_name_english')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('clinic_name_arabic')}
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone_number')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('email_address')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? t('saving') : t('save_changes')}
            </button>
          </div>
        </form>
      </div>

      {profile?.role === 'clinic_admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">{t('clinic_type_subscription') || 'Clinic Type & Billing'}</h2>
            </div>
            <button
              onClick={() => {
                setSelectedClinicType(currentClinicType?.id || null);
                setShowClinicTypeModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t('change_clinic_type') || 'Change Clinic Type'}
            </button>
          </div>

          {currentClinicType ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border border-purple-200">
                <p className="text-sm text-purple-600 font-medium mb-1">{t('current_plan') || 'Current Plan'}</p>
                <p className="text-2xl font-bold text-purple-900 mb-2">{currentClinicType.name}</p>
                <p className="text-sm text-purple-700">{currentClinicType.description}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <p className="text-xs text-blue-600">{t('clinicTypes.dentists') || 'Dentists'}</p>
                  <p className="text-lg font-bold text-blue-900">{currentClinicType.min_dentists}-{currentClinicType.max_dentists}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-green-600">{t('clinicTypes.receptionists') || 'Receptionists'}</p>
                  <p className="text-lg font-bold text-green-900">{currentClinicType.min_receptionists}-{currentClinicType.max_receptionists}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                  <p className="text-xs text-yellow-600">{t('clinicTypes.cleaners') || 'Cleaners'}</p>
                  <p className="text-lg font-bold text-yellow-900">{currentClinicType.min_cleaners}-{currentClinicType.max_cleaners}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <p className="text-xs text-orange-600">{t('clinicTypes.workers') || 'Workers'}</p>
                  <p className="text-lg font-bold text-orange-900">{currentClinicType.min_workers}-{currentClinicType.max_workers}</p>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700 font-medium">{t('billing_rate') || 'Billing Rate'}</span>
                  <span className="text-sm font-semibold text-green-900">
                    {t('per_assigned_subscription') || 'Per assigned subscription'}
                  </span>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>{t('no_clinic_type') || 'No clinic type assigned'}</p>
            </div>
          )}
        </div>
      )}

      {profile?.role === 'clinic_admin' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-600 rounded-full">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('whatsapp_integration')}</h2>
                <p className="text-gray-600 mt-1">
                  Send automated appointment reminders, invoices, and prescriptions via WhatsApp
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Appointment Reminders
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    Invoice Delivery
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    Prescription Sharing
                  </span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                    Payment Reminders
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('whatsapp')}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <MessageSquare className="w-5 h-5" />
              {t('configure_whatsapp')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {profile?.role === 'clinic_admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-sky-600" />
              <h2 className="text-xl font-bold text-gray-900">Custom Template Designer</h2>
            </div>
            <button
              onClick={() => setShowCustomTemplateDesigner(true)}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-colors flex items-center gap-2"
            >
              <Palette className="w-5 h-5" />
              Create Custom Template
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Design custom HTML/CSS templates for invoices and prescriptions with live preview and visual editing.
          </p>

          {customTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{template.template_name}</h3>
                      <span className="text-xs text-gray-500 uppercase">{template.template_type}</span>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText className="w-3 h-3" />
                    <span>Custom HTML/CSS</span>
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Custom Templates Yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first custom template to get started with personalized invoices and prescriptions.
              </p>
              <button
                onClick={() => setShowCustomTemplateDesigner(true)}
                className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors inline-flex items-center gap-2"
              >
                <Palette className="w-4 h-4" />
                Create Your First Template
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">{t('need_help')}</h3>
        <p className="text-blue-800">
          {t('need_help_message')}
        </p>
      </div>

      {showCustomTemplateDesigner && profile?.clinic_id && (
        <CustomTemplateDesigner
          clinicId={profile.clinic_id}
          onClose={() => {
            setShowCustomTemplateDesigner(false);
            loadCustomTemplates();
          }}
        />
      )}

      {showClinicTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">{t('change_clinic_type') || 'Change Clinic Type'}</h2>
                  <p className="text-purple-100 text-sm">{t('select_clinic_type_subtitle') || 'Select a plan that fits your clinic'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowClinicTypeModal(false);
                  setSelectedClinicType(null);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {currentClinicType && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-purple-600 p-2 rounded-lg">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 font-medium">{t('currentPlan') || 'Current Plan'}</p>
                      <p className="text-xl font-bold text-purple-900">{currentClinicType.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('clinicTypes.dentists') || 'Dentists'}</p>
                      <p className="text-sm font-bold text-gray-900">{currentClinicType.min_dentists}-{currentClinicType.max_dentists}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('clinicTypes.receptionists') || 'Receptionists'}</p>
                      <p className="text-sm font-bold text-gray-900">{currentClinicType.min_receptionists}-{currentClinicType.max_receptionists}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('billing_rate') || 'Rate'}</p>
                      <p className="text-sm font-bold text-green-700">{t('per_assigned_subscription') || 'Per subscription'}</p>
                    </div>

                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('status') || 'Status'}</p>
                      <p className="text-sm font-bold text-green-700">{t('active') || 'Active'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableClinicTypes.map((type) => {
                  const isCurrent = currentClinicType?.id === type.id;
                  const isSelected = selectedClinicType === type.id;

                  return (
                    <div
                      key={type.id}
                      className={`border-2 rounded-xl p-5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 shadow-lg'
                          : isCurrent
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                      } ${isCurrent ? 'opacity-75' : ''}`}
                      onClick={() => setSelectedClinicType(type.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
                          <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
                            {t('current') || 'Current'}
                          </span>
                        )}
                        {isSelected && !isCurrent && (
                          <CheckCircle className="w-6 h-6 text-purple-600" />
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('clinicTypes.dentists') || 'Dentists'}:</span>
                          <span className="font-medium">{type.min_dentists}-{type.max_dentists}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('clinicTypes.receptionists') || 'Receptionists'}:</span>
                          <span className="font-medium">{type.min_receptionists}-{type.max_receptionists}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('clinicTypes.cleaners') || 'Cleaners'}:</span>
                          <span className="font-medium">{type.min_cleaners}-{type.max_cleaners}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('clinicTypes.workers') || 'Workers'}:</span>
                          <span className="font-medium">{type.min_workers}-{type.max_workers}</span>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{t('billing_rate') || 'Billing Rate'}:</span>
                          <span className="text-sm font-semibold text-gray-700">{t('per_assigned_subscription') || 'Per assigned subscription'}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg mt-1">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      {t('billing_update_notice') || 'Important Notice'}
                    </h4>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      {t('billing_update_message') || 'Changing your clinic type will automatically update your billing calculations based on the new rate. This will affect your monthly subscription fees going forward.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleClinicTypeUpdate}
                  disabled={!selectedClinicType || selectedClinicType === currentClinicType?.id || saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  <Save className="w-5 h-5" />
                  {saving ? (t('updating') || 'Updating...') : (t('update_clinic_type') || 'Update Clinic Type')}
                </button>
                <button
                  onClick={() => {
                    setShowClinicTypeModal(false);
                    setSelectedClinicType(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('cancel') || 'Cancel'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                {t('clinic_type_help') || 'Select a clinic type that matches your current operations and staff size.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
