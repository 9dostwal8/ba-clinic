// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Phone, Save, RefreshCw, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';

interface NotificationSettings {
  id?: string;
  clinic_id: string;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  reminder_hours_before: number;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  whatsapp_api_key: string;
  auto_reminder_enabled: boolean;
}

interface NotificationTemplate {
  id?: string;
  clinic_id: string;
  template_type: string;
  language_code: string;
  message_template: string;
  is_active: boolean;
}

interface NotificationLog {
  id: string;
  notification_type: string;
  phone_number: string;
  message_content: string;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  error_message: string | null;
  patients: { full_name: string } | null;
}

export function NotificationsModule() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'settings' | 'templates' | 'logs'>('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    clinic_id: profile?.clinic_id || '',
    sms_enabled: false,
    whatsapp_enabled: false,
    reminder_hours_before: 24,
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    whatsapp_api_key: '',
    auto_reminder_enabled: true,
  });
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (profile?.clinic_id) {
      loadData();
    }
  }, [profile?.clinic_id]);

  const loadData = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    try {
      const [settingsRes, templatesRes, logsRes] = await Promise.all([
        supabase
          .from('notification_settings')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .maybeSingle(),
        supabase
          .from('notification_templates')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .order('language_code'),
        supabase
          .from('notification_logs')
          .select('*, patients(full_name)')
          .eq('clinic_id', profile.clinic_id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
      setTemplates(templatesRes.data || []);
      setLogs(logsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          ...settings,
          clinic_id: profile.clinic_id,
        });

      if (error) throw error;
      alert(t('settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(t('errorSavingSettings'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (template: NotificationTemplate) => {
    if (!profile?.clinic_id) return;

    try {
      const { error } = await supabase
        .from('notification_templates')
        .upsert({
          ...template,
          clinic_id: profile.clinic_id,
        });

      if (error) throw error;
      alert(t('templateSaved'));
      loadData();
    } catch (error) {
      console.error('Error saving template:', error);
      alert(t('errorSavingTemplate'));
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (filterType !== 'all' && log.notification_type !== filterType) return false;
    return true;
  });

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent' || l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{t('notificationSettings')}</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Bell className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('reminderSettings')}</span>
              <span className="sm:hidden">{t('settings')}</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('messageTemplates')}</span>
              <span className="sm:hidden">{t('templates')}</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-sky-600 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('notificationHistory')}</span>
              <span className="sm:hidden">{t('history')}</span>
            </button>
          </nav>
        </div>

        <div className="p-3 sm:p-4 md:p-6">
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('notificationChannels')}</h3>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.sms_enabled}
                      onChange={(e) => setSettings({ ...settings, sms_enabled: e.target.checked })}
                      className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('enableSMS')}</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.whatsapp_enabled}
                      onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                      className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('enableWhatsApp')}</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.auto_reminder_enabled}
                      onChange={(e) => setSettings({ ...settings, auto_reminder_enabled: e.target.checked })}
                      className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{t('autoReminders')}</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('hoursBeforeAppointment')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="72"
                      value={settings.reminder_hours_before}
                      onChange={(e) => setSettings({ ...settings, reminder_hours_before: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{t('twilioSettings')}</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('twilioAccountSid')}
                    </label>
                    <input
                      type="text"
                      value={settings.twilio_account_sid}
                      onChange={(e) => setSettings({ ...settings, twilio_account_sid: e.target.value })}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('twilioAuthToken')}
                    </label>
                    <input
                      type="password"
                      value={settings.twilio_auth_token}
                      onChange={(e) => setSettings({ ...settings, twilio_auth_token: e.target.value })}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('twilioPhoneNumber')}
                    </label>
                    <input
                      type="tel"
                      value={settings.twilio_phone_number}
                      onChange={(e) => setSettings({ ...settings, twilio_phone_number: e.target.value })}
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-gray-400"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t('saveSettings')}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              {['en', 'ar'].map(lang => {
                const template = templates.find(
                  t => t.language_code === lang && t.template_type === 'appointment_reminder'
                ) || {
                  clinic_id: profile?.clinic_id || '',
                  template_type: 'appointment_reminder',
                  language_code: lang,
                  message_template: '',
                  is_active: true,
                };

                return (
                  <div key={lang} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                      {lang === 'en' ? t('englishTemplate') : t('arabicTemplate')}
                    </h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('messageTemplate')}
                      </label>
                      <textarea
                        value={template.message_template}
                        onChange={(e) => {
                          const newTemplates = [...templates];
                          const index = newTemplates.findIndex(
                            t => t.language_code === lang && t.template_type === 'appointment_reminder'
                          );
                          if (index >= 0) {
                            newTemplates[index] = { ...newTemplates[index], message_template: e.target.value };
                          } else {
                            newTemplates.push({ ...template, message_template: e.target.value });
                          }
                          setTemplates(newTemplates);
                        }}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>

                    <div className="bg-gray-50 rounded-md p-2 sm:p-3 mb-4">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">{t('availablePlaceholders')}:</p>
                      <div className="flex flex-wrap gap-1 sm:gap-2 text-xs">
                        <code className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">{'{{patient_name}}'}</code>
                        <code className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">{'{{clinic_name}}'}</code>
                        <code className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">{'{{appointment_date}}'}</code>
                        <code className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">{'{{appointment_time}}'}</code>
                        <code className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">{'{{doctor_name}}'}</code>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveTemplate(template)}
                      className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {t('saveTemplate')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="all">{t('allStatuses')}</option>
                    <option value="sent">{t('sent')}</option>
                    <option value="delivered">{t('delivered')}</option>
                    <option value="failed">{t('failed')}</option>
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="all">{t('allTypes')}</option>
                    <option value="sms">{t('notification_type_sms')}</option>
                    <option value="whatsapp">{t('notification_type_whatsapp')}</option>
                  </select>
                </div>

                <div className="flex gap-4 sm:gap-6 text-sm">
                  <div className="text-center flex-1 sm:flex-none">
                    <p className="text-xs sm:text-sm text-gray-500">{t('totalSent')}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="text-center flex-1 sm:flex-none">
                    <p className="text-xs sm:text-sm text-gray-500">{t('successRate')}</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('patient')}
                          </th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('type')}
                          </th>
                          <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('phoneNumber')}
                          </th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('status')}
                          </th>
                          <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('sentAt')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-2 sm:px-4 py-6 sm:py-8 text-center text-sm text-gray-500">
                              {t('noNotificationsYet')}
                            </td>
                          </tr>
                        ) : (
                          filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                                {log.patients?.full_name || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs ${
                                  log.notification_type === 'whatsapp'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {log.notification_type === 'whatsapp' ? 'WA' : 'SMS'}
                                </span>
                              </td>
                              <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                                {log.phone_number}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                {log.status === 'sent' || log.status === 'delivered' ? (
                                  <span className="flex items-center text-green-600">
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    <span className="hidden sm:inline">{t(log.status)}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center text-red-600">
                                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    <span className="hidden sm:inline">{t('failed')}</span>
                                  </span>
                                )}
                              </td>
                              <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">
                                {new Date(log.sent_at).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
