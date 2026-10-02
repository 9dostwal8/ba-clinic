// @ts-nocheck
import { useState, useEffect } from 'react';
import { Cloud, Save, Clock, CheckCircle, XCircle, RefreshCw, Settings, Calendar, Upload, AlertCircle, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';

interface GoogleDriveSettings {
  id: string;
  clinic_id: string;
  is_enabled: boolean;
  folder_id: string;
  service_account_email: string;
  service_account_json: string;
  connection_status: string;
  backup_schedule: string;
  backup_time: string;
  retention_days: number;
  last_backup_at: string | null;
}

interface BackupLog {
  id: string;
  clinic_id: string;
  backup_type: string;
  status: string;
  file_name: string;
  file_size: number;
  records_count: number;
  tables_included: string[];
  started_at: string;
  completed_at: string;
  error_message: string | null;
}

export default function GoogleDriveBackupModule() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<GoogleDriveSettings | null>(null);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingBackup, setTestingBackup] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [serviceAccountFile, setServiceAccountFile] = useState<File | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    loadSettings();
    loadBackupLogs();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('google_drive_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Initialize empty settings if none exist
      if (!data) {
        setSettings({
          id: '',
          clinic_id: '',
          is_enabled: false,
          folder_id: '',
          service_account_email: '',
          service_account_json: '',
          connection_status: 'not_configured',
          backup_schedule: 'daily',
          backup_time: '02:00',
          retention_days: 30,
          last_backup_at: null
        });
      } else {
        setSettings(data);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      // Initialize empty settings on error
      setSettings({
        id: '',
        clinic_id: '',
        is_enabled: false,
        folder_id: '',
        service_account_email: '',
        service_account_json: '',
        connection_status: 'not_configured',
        backup_schedule: 'daily',
        backup_time: '02:00',
        retention_days: 30,
        last_backup_at: null
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBackupLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('automated_backup_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBackupLogs(data || []);
    } catch (error: any) {
      console.error('Error loading logs:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!json.client_email || !json.private_key) {
        throw new Error(t('invalid_service_account_file'));
      }

      setServiceAccountFile(file);
      setSettings(prev => prev ? {
        ...prev,
        service_account_email: json.client_email,
        service_account_json: text
      } : null);

      setMessage({ type: 'success', text: t('file_uploaded_successfully') });
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('file_upload_error')}: ${error.message}` });
    }
  };

  const copyEmailToClipboard = () => {
    if (settings?.service_account_email) {
      navigator.clipboard.writeText(settings.service_account_email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Use SQL function to get clinic_id (bypasses RLS)
      const { data: clinicData, error: clinicError } = await supabase
        .rpc('current_user_clinic_id');

      if (clinicError) {
        console.error('Error fetching clinic_id:', clinicError);
        throw new Error(`Failed to fetch clinic data: ${clinicError.message}`);
      }

      const clinicId = clinicData;

      if (!clinicId) {
        console.error('No clinic_id returned from function');
        throw new Error('No clinic found for user. Please contact support.');
      }

      const settingsData = {
        clinic_id: clinicId,
        is_enabled: settings.is_enabled,
        folder_id: settings.folder_id || '',
        service_account_email: settings.service_account_email || '',
        service_account_json: settings.service_account_json || '',
        connection_status: settings.service_account_json && settings.folder_id ? 'configured' : 'not_configured',
        backup_schedule: settings.backup_schedule || 'daily',
        backup_time: settings.backup_time || '02:00:00',
        retention_days: settings.retention_days || 30,
        updated_at: new Date().toISOString()
      };

      if (settings.id && settings.id !== '') {
        settingsData.id = settings.id;
      }

      const { error } = await supabase
        .from('google_drive_settings')
        .upsert(settingsData, {
          onConflict: 'clinic_id'
        });

      if (error) throw error;

      setMessage({ type: 'success', text: t('settings_saved_success') });
      loadSettings();
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('save_failed')}: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const testBackup = async () => {
    setTestingBackup(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/automated-google-drive-backup`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${t('backup_test_success')}: ${result.processed} ${t('clinics')}`
        });
        loadBackupLogs();
        loadSettings();
      } else {
        throw new Error(result.error || 'Backup failed');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('backup_test_failed')}: ${error.message}` });
    } finally {
      setTestingBackup(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isConfigured = settings?.service_account_json && settings?.folder_id;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('google_drive_backup')}</h2>
          <p className="text-gray-600 mt-1">{t('google_drive_backup_desc')}</p>
        </div>
        <Cloud className="w-8 h-8 text-blue-600" />
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-6">
        {/* Setup Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('simple_setup')}
            </h3>
            {isConfigured && (
              <span className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {t('configured')}
              </span>
            )}
          </div>

          {/* Step-by-step guide */}
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <h4 className="font-semibold">{t('step_1_title')}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">{t('step_1_desc')}</p>
              <button
                onClick={() => setShowSetupGuide(true)}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {t('view_detailed_guide')}
              </button>
            </div>

            {/* Step 2 */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <h4 className="font-semibold">{t('step_2_title')}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">{t('step_2_desc')}</p>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 cursor-pointer border border-blue-200">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('upload_json_file')}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                {serviceAccountFile && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {serviceAccountFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Step 3 - Show service account email */}
            {settings?.service_account_email && (
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                  <h4 className="font-semibold">{t('step_3_title')}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">{t('step_3_desc')}</p>

                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <code className="text-sm text-gray-800 break-all">{settings.service_account_email}</code>
                  <button
                    onClick={copyEmailToClipboard}
                    className="ml-3 p-2 hover:bg-gray-200 rounded transition flex-shrink-0"
                    title={t('copy_email')}
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 - Folder ID */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <h4 className="font-semibold">{t('step_4_title')}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">{t('step_4_desc')}</p>

              <div className="space-y-2">
                <input
                  type="text"
                  value={settings?.folder_id || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, folder_id: e.target.value } : null)}
                  placeholder="1a2b3c4d5e6f7g8h9i"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
                />
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                  <p className="text-blue-800">
                    <strong>{t('example')}:</strong> {t('folder_url_example')}
                  </p>
                  <p className="text-blue-600 mt-1 font-mono break-all">
                    drive.google.com/drive/folders/<span className="bg-yellow-200 px-1">1a2b3c4d5e6f7g8h9i</span>
                  </p>
                  <p className="text-blue-800 mt-1">{t('copy_highlighted_part')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          {isConfigured && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-4">{t('backup_settings')}</h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={settings?.is_enabled || false}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, is_enabled: e.target.checked } : null)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">{t('enable_automatic_backup')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('backup_time')}</label>
                  <input
                    type="time"
                    value={settings?.backup_time || '02:00'}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, backup_time: e.target.value } : null)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    disabled={!settings?.is_enabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('retention_days')}</label>
                  <input
                    type="number"
                    value={settings?.retention_days || 30}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, retention_days: parseInt(e.target.value) } : null)}
                    min="1"
                    max="365"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    disabled={!settings?.is_enabled}
                  />
                </div>
              </div>

              {settings?.last_backup_at && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{t('last_backup')}: {new Date(settings.last_backup_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={saveSettings}
              disabled={saving || !settings}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('save_settings')}
            </button>

            {isConfigured && (
              <button
                onClick={testBackup}
                disabled={testingBackup || !settings?.is_enabled}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {testingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                {t('test_backup_now')}
              </button>
            )}
          </div>
        </div>

        {/* Backup History */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('backup_history')}
            </h3>
            <button
              onClick={loadBackupLogs}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {t('refresh')}
            </button>
          </div>

          {backupLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('no_backups_found')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupLogs.map(log => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{log.file_name}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(log.started_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      {t('type')}: {log.backup_type} |
                      {t('size')}: {formatFileSize(log.file_size || 0)} |
                      {t('records')}: {log.records_count || 0}
                    </p>
                    {log.tables_included && (
                      <p>{t('tables')}: {log.tables_included.length}</p>
                    )}
                    {log.error_message && (
                      <p className="text-red-600">
                        {t('error')}: {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{t('detailed_setup_guide')}</h3>

            <div className="space-y-6 text-sm">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3">{t('what_you_need')}</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>{t('google_account')}</li>
                  <li>{t('google_cloud_project')}</li>
                  <li>{t('5_minutes_time')}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">{t('detailed_step_1')}</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>{t('go_to_console')}</li>
                  <li>{t('create_new_project')}</li>
                  <li>{t('enable_drive_api')}</li>
                  <li>{t('create_service_account')}</li>
                  <li>{t('download_json_key')}</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">{t('important_tip')}</h4>
                <p className="text-green-800">{t('service_account_tip')}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSetupGuide(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('got_it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
