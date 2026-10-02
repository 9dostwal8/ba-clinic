// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, ExternalLink, Check, Info, Phone, FileText, RotateCcw, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface WhatsAppSettings {
  id?: string;
  clinic_id: string;
  phone_number: string;
  enabled: boolean;
  appointment_reminders_enabled: boolean;
  invoice_notifications_enabled: boolean;
  prescription_notifications_enabled: boolean;
  payment_reminders_enabled: boolean;
}

interface MessageTemplate {
  id?: string;
  clinic_id: string;
  message_type: string;
  template_text: string;
  language: string;
  is_active: boolean;
}

const MESSAGE_TYPES = [
  'appointment_reminder',
  'payment_reminder',
  'follow_up_reminder',
  'invoice_notification',
  'prescription_notification'
];

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  appointment_reminder: ['patient_name', 'doctor_name', 'appointment_date', 'appointment_time', 'clinic_name'],
  payment_reminder: ['patient_name', 'amount_due', 'invoice_number', 'due_date', 'clinic_name'],
  follow_up_reminder: ['patient_name', 'last_visit_date', 'treatment_type', 'clinic_name'],
  invoice_notification: ['patient_name', 'total_amount', 'invoice_number', 'clinic_name'],
  prescription_notification: ['patient_name', 'doctor_name', 'prescription_date', 'clinic_name']
};

export function WhatsAppSettingsModule() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'templates'>('settings');
  const [settings, setSettings] = useState<WhatsAppSettings>({
    clinic_id: profile?.clinic_id || '',
    phone_number: '',
    enabled: true,
    appointment_reminders_enabled: true,
    invoice_notifications_enabled: true,
    prescription_notifications_enabled: true,
    payment_reminders_enabled: true,
  });
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  useEffect(() => {
    if (profile?.clinic_id) {
      loadSettings();
      loadTemplates();
    }
  }, [profile?.clinic_id]);


  const loadSettings = async () => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
      }

      if (data) {
        setSettings({
          id: data.id,
          clinic_id: data.clinic_id,
          phone_number: data.phone_number || '',
          enabled: data.enabled !== false,
          appointment_reminders_enabled: data.appointment_reminders_enabled !== false,
          invoice_notifications_enabled: data.invoice_notifications_enabled !== false,
          prescription_notifications_enabled: data.prescription_notifications_enabled !== false,
          payment_reminders_enabled: data.payment_reminders_enabled !== false,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!profile?.clinic_id) return;

    try {
      setSaving(true);

      const dataToSave = {
        clinic_id: profile.clinic_id,
        phone_number: settings.phone_number,
        enabled: settings.enabled,
        appointment_reminders_enabled: settings.appointment_reminders_enabled,
        invoice_notifications_enabled: settings.invoice_notifications_enabled,
        prescription_notifications_enabled: settings.prescription_notifications_enabled,
        payment_reminders_enabled: settings.payment_reminders_enabled,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('whatsapp_settings')
          .update(dataToSave)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSettings({ ...settings, id: data.id });
        }
      }

      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const loadTemplates = async () => {
    if (!profile?.clinic_id) return;

    try {
      console.log('🔍 Loading templates for clinic:', profile.clinic_id);
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .order('message_type');

      if (error) throw error;
      console.log('✅ Loaded templates:', data?.length || 0);
      setTemplates(data || []);
    } catch (error) {
      console.error('❌ Error loading templates:', error);
    }
  };

  const saveTemplate = async (template: MessageTemplate) => {
    if (!profile?.clinic_id) return;

    try {
      setSaving(true);
      console.log('💾 Saving template:', template.message_type);

      const templateData = {
        clinic_id: profile.clinic_id,
        message_type: template.message_type,
        template_text: template.template_text,
        language: 'all',
        is_active: template.is_active ?? true,
        updated_at: new Date().toISOString()
      };

      console.log('📤 Sending template data:', templateData);

      const { error } = await supabase
        .from('whatsapp_message_templates')
        .upsert(templateData, {
          onConflict: 'clinic_id,message_type,language'
        });
      console.log('✅ Template saved successfully');

      if (error) throw error;

      alert(t('template_saved'));
      await loadTemplates();
      setSelectedTemplate(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetTemplateToDefault = async (messageType: string) => {
    if (!profile?.clinic_id || !confirm(t('reset_to_default') + '?')) return;

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from('whatsapp_message_templates')
        .delete()
        .eq('clinic_id', profile.clinic_id)
        .eq('message_type', messageType);

      if (deleteError) throw deleteError;

      const { error: createError } = await supabase
        .rpc('create_default_whatsapp_templates', { p_clinic_id: profile.clinic_id });

      if (createError) throw createError;

      alert(t('template_reset'));
      await loadTemplates();
      setSelectedTemplate(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyVariableToClipboard = (variable: string) => {
    navigator.clipboard.writeText(`{${variable}}`);
  };

  const testWhatsApp = () => {
    if (!settings.phone_number) {
      alert('Please enter your WhatsApp number first');
      return;
    }

    const message = encodeURIComponent('Test message from your Dental Clinic Management System! 🦷');
    const url = `https://wa.me/${settings.phone_number.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading WhatsApp Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-600 rounded-full">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            FREE WhatsApp Integration
          </h2>
          <p className="text-gray-600">
            No subscription required - Uses WhatsApp Web (wa.me links)
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('whatsapp_settings')}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'templates'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('message_templates')}
          </div>
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <>
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2 text-lg">
              How FREE WhatsApp Integration Works
            </h3>
            <ul className="space-y-2 text-green-800">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>100% FREE</strong> - No subscription, no API costs, no Twilio needed</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Uses WhatsApp Web</strong> - Opens WhatsApp with pre-filled message</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>One-Click Send</strong> - Staff clicks button, WhatsApp opens, clicks send</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Your Clinic Number</strong> - Messages sent from your official WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Works Everywhere</strong> - Desktop, mobile, any device with WhatsApp</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">WhatsApp Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Clinic WhatsApp Number *
            </label>
            <input
              type="tel"
              value={settings.phone_number}
              onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })}
              placeholder="+964 770 123 4567"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter your clinic's WhatsApp number with country code (e.g., +964 770 123 4567)
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div>
              <label className="font-medium text-gray-900">Enable WhatsApp Integration</label>
              <p className="text-sm text-gray-600">Show WhatsApp buttons throughout the system</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Enable WhatsApp Buttons For</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
            <div>
              <label className="font-medium text-gray-900">Appointment Reminders</label>
              <p className="text-sm text-gray-600">Show "Send WhatsApp Reminder" button in appointments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.appointment_reminders_enabled}
                onChange={(e) => setSettings({ ...settings, appointment_reminders_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
            <div>
              <label className="font-medium text-gray-900">Invoice Notifications</label>
              <p className="text-sm text-gray-600">Show "Send Invoice via WhatsApp" button</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.invoice_notifications_enabled}
                onChange={(e) => setSettings({ ...settings, invoice_notifications_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
            <div>
              <label className="font-medium text-gray-900">Prescription Notifications</label>
              <p className="text-sm text-gray-600">Show "Send Prescription via WhatsApp" button</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.prescription_notifications_enabled}
                onChange={(e) => setSettings({ ...settings, prescription_notifications_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
            <div>
              <label className="font-medium text-gray-900">Payment Reminders</label>
              <p className="text-sm text-gray-600">Show "Send Payment Reminder" button</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.payment_reminders_enabled}
                onChange={(e) => setSettings({ ...settings, payment_reminders_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How It Works in Practice</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
          <li>Staff member views appointment/invoice/prescription</li>
          <li>Clicks "Send via WhatsApp" button</li>
          <li>WhatsApp opens in new tab/window with pre-filled message</li>
          <li>Staff reviews message, clicks Send in WhatsApp</li>
          <li>Message sent from YOUR clinic WhatsApp number ✓</li>
          <li>Patient receives professional message instantly</li>
        </ol>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 text-lg">Test WhatsApp Integration</h3>
        <p className="text-gray-600 mb-4">
          Click the button below to test if your WhatsApp number is configured correctly.
          WhatsApp will open with a test message.
        </p>
        <button
          onClick={testWhatsApp}
          disabled={!settings.phone_number}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          Test WhatsApp Now
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={saveSettings}
          disabled={saving || !settings.phone_number}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg font-medium shadow-lg"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-1">One Message Template for All Languages</p>
                <p className="text-sm text-blue-800">Customize the message templates below. These templates will be used for ALL patients regardless of their language preference. Use the available variables to personalize messages.</p>
              </div>
            </div>
          </div>

          {/* Templates List */}
          <div className="space-y-4">
            {MESSAGE_TYPES.map((messageType) => {
              const template = templates.find(t => t.message_type === messageType);
              const isEditing = selectedTemplate?.message_type === messageType;
              const variables = TEMPLATE_VARIABLES[messageType] || [];

              return (
                <div key={messageType} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t(messageType)}
                    </h3>
                    <div className="flex gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => setSelectedTemplate(template || {
                            clinic_id: profile?.clinic_id || '',
                            message_type: messageType,
                            template_text: '',
                            language: 'all',
                            is_active: true
                          })}
                          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                        >
                          {t('edit_template')}
                        </button>
                      )}
                      {template && (
                        <button
                          onClick={() => resetTemplateToDefault(messageType)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 flex items-center gap-2"
                          disabled={saving}
                        >
                          <RotateCcw className="w-4 h-4" />
                          {t('reset_to_default')}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Available Variables */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">{t('available_variables')}:</p>
                        <div className="flex flex-wrap gap-2">
                          {variables.map((variable) => (
                            <button
                              key={variable}
                              onClick={() => copyVariableToClipboard(variable)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              title="Click to copy"
                            >
                              <Copy className="w-3 h-3" />
                              {`{${variable}}`}
                              <span className="text-xs text-gray-500 ml-1">({t(`variable_${variable}`)})</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Template Editor */}
                      <textarea
                        value={selectedTemplate?.template_text || ''}
                        onChange={(e) => setSelectedTemplate({
                          ...selectedTemplate!,
                          template_text: e.target.value
                        })}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
                        placeholder="Enter your message template..."
                      />

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={() => saveTemplate(selectedTemplate!)}
                          disabled={saving || !selectedTemplate?.template_text}
                          className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? t('saving') : t('save_template')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {template?.template_text || t('no_template_set')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
