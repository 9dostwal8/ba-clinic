// @ts-nocheck
import { useState, useEffect } from 'react';
import { Database, Download, Upload, AlertCircle, CheckCircle, Loader, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';

interface Backup {
  id: string;
  backup_name: string;
  backup_type: string;
  file_size: number;
  tables_included: string[];
  records_count: number;
  status: string;
  created_at: string;
}

export default function DatabaseManagementModule() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'backups' | 'migration'>('export');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [exportOptions, setExportOptions] = useState({
    includeSchema: true,
    includeData: true,
    selectedTables: [] as string[],
  });

  const tables = [
    'clinics', 'users', 'patients', 'appointments', 'treatments', 'treatment_types',
    'invoices', 'prescriptions', 'prescription_items', 'inventory_items', 'expenses',
    'staff_salaries', 'translations', 'translation_keys', 'subscription_plans',
    'clinic_subscriptions', 'subscription_features', 'notification_logs'
  ];

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase
        .from('database_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBackups(data || []);
    } catch (error: any) {
      console.error('Error loading backups:', error);
    }
  };

  const exportDatabase = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const tablesToExport = exportOptions.selectedTables.length > 0
        ? exportOptions.selectedTables
        : tables;

      const exportData: any = {
        schema: {},
        data: {},
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          tables: tablesToExport
        }
      };

      // Export data from each table
      let totalRecords = 0;
      for (const table of tablesToExport) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');

          if (!error && data) {
            exportData.data[table] = data;
            totalRecords += data.length;
          }
        } catch (err) {
          console.warn(`Could not export table ${table}:`, err);
        }
      }

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save backup record
      await supabase.from('database_backups').insert({
        backup_name: `Export ${new Date().toLocaleString()}`,
        backup_type: exportOptions.includeSchema && exportOptions.includeData ? 'full' :
                     exportOptions.includeData ? 'data_only' : 'schema_only',
        file_size: blob.size,
        tables_included: tablesToExport,
        records_count: totalRecords,
        status: 'completed'
      });

      setMessage({ type: 'success', text: `${t('database_exported_success')}! ${totalRecords} ${t('records')} ${tablesToExport.length} ${t('tables')}.` });
      loadBackups();
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('export_failed')}: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const importDatabase = async (file: File) => {
    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.data || !importData.metadata) {
        throw new Error(t('invalid_backup_format'));
      }

      let successCount = 0;
      let errorCount = 0;

      for (const [table, records] of Object.entries(importData.data) as [string, any[]][]) {
        if (!Array.isArray(records) || records.length === 0) continue;

        try {
          const { error } = await supabase
            .from(table)
            .upsert(records, { onConflict: 'id' });

          if (error) {
            console.error(`Error importing ${table}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to import ${table}:`, err);
          errorCount++;
        }
      }

      setMessage({
        type: successCount > 0 ? 'success' : 'error',
        text: `${successCount} ${t('tables')} ${t('status')}, ${errorCount} ${t('import_failed')}`
      });

    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('import_failed')}: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (id: string) => {
    if (!confirm(t('delete_backup_confirm'))) return;

    try {
      const { error } = await supabase
        .from('database_backups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: t('backup_deleted_success') });
      loadBackups();
    } catch (error: any) {
      setMessage({ type: 'error', text: `${t('delete_failed')}: ${error.message}` });
    }
  };

  const exportMigrationSQL = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Call the edge function to export schema
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-schema`;

      console.log('Calling edge function:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => {
        console.error('Fetch error:', err);
        throw new Error(`Network error: ${err.message}`);
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const result = await response.json();
      console.log('Result:', result);

      if (!result.success) {
        throw new Error(result.error || t('sql_export_failed'));
      }

      const sqlContent = result.sql;

      // Create downloadable SQL file
      const blob = new Blob([sqlContent], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schema-migration-${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save backup record
      await supabase.from('database_backups').insert({
        backup_name: `Schema Migration ${new Date().toLocaleString()}`,
        backup_type: 'schema_only',
        file_size: blob.size,
        tables_included: [],
        records_count: 0,
        status: 'completed'
      });

      setMessage({ type: 'success', text: `${t('schema_migration_generated')}! ${t('size')}: ${formatFileSize(blob.size)}` });
      loadBackups();
    } catch (error: any) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: `${t('sql_export_failed')}: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('database_management')}</h2>
          <p className="text-gray-600 mt-1">{t('database_management_desc')}</p>
        </div>
        <Database className="w-8 h-8 text-blue-600" />
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { key: 'export' as const, label: t('export_database'), icon: Download },
              { key: 'import' as const, label: t('import_database'), icon: Upload },
              { key: 'migration' as const, label: t('sql_migration'), icon: Database },
              { key: 'backups' as const, label: t('backup_history'), icon: Database },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('export_options')}</h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeSchema"
                      checked={exportOptions.includeSchema}
                      onChange={(e) => setExportOptions({ ...exportOptions, includeSchema: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="includeSchema" className="text-sm font-medium">
                      {t('include_schema')}
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="includeData"
                      checked={exportOptions.includeData}
                      onChange={(e) => setExportOptions({ ...exportOptions, includeData: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="includeData" className="text-sm font-medium">
                      {t('include_data')}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">{t('select_tables')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-4 border rounded-lg">
                  {tables.map(table => (
                    <label key={table} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={exportOptions.selectedTables.includes(table)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportOptions({ ...exportOptions, selectedTables: [...exportOptions.selectedTables, table] });
                          } else {
                            setExportOptions({ ...exportOptions, selectedTables: exportOptions.selectedTables.filter(t => t !== table) });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      {table}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={exportDatabase}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {t('export_database')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900">{t('import_warning_title')}</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      {t('import_warning_message')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('select_backup_file')}
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importDatabase(file);
                  }}
                  disabled={loading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {loading && (
                <div className="flex items-center gap-3 text-blue-600">
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>{t('importing_database')}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{t('generate_schema_migration')}</h3>
                <p className="text-gray-600 mb-6">
                  {t('schema_migration_desc')}
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">{t('whats_included')}:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• All table definitions with columns and data types</li>
                        <li>• Primary keys and constraints</li>
                        <li>• Row Level Security (RLS) enabled</li>
                        <li>• Helper functions (is_super_admin, current_user_clinic_id, etc.)</li>
                        <li>• Subscription limit checking function</li>
                        <li>• Update triggers (updated_at columns)</li>
                        <li>• Ready to run in Supabase SQL Editor</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-1">{t('important_note')}</h4>
                      <p className="text-sm text-yellow-800">
                        {t('schema_only_note')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={exportMigrationSQL}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        {t('generating_schema_migration')}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {t('generate_schema_migration')}
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{t('after_export')}:</h4>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                    <li>The SQL file will download automatically as <code className="bg-gray-200 px-2 py-0.5 rounded">schema-migration-YYYY-MM-DD.sql</code></li>
                    <li>To use on another database: Open Supabase SQL Editor → New Query → Paste contents → Run</li>
                    <li>The file uses <code className="bg-gray-200 px-2 py-0.5 rounded">IF NOT EXISTS</code> to safely create tables</li>
                    <li>Great for: New deployments, fresh database setup, database cloning, version control</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('backup_history')}</h3>
                <button
                  onClick={loadBackups}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {t('refresh')}
                </button>
              </div>

              {backups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('no_backups_found')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map(backup => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium">{backup.backup_name}</h4>
                          <span className={`text-xs px-2 py-1 rounded ${
                            backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                            backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {backup.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>{t('type')}: {backup.backup_type} | {t('size')}: {formatFileSize(backup.file_size || 0)} | {t('records')}: {backup.records_count || 0}</p>
                          <p>{t('tables')}: {backup.tables_included?.length || 0} | {t('created')}: {new Date(backup.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteBackup(backup.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete backup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
