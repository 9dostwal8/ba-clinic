// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Eye, RotateCcw, Code, FileText, Mail, Phone } from 'lucide-react';

export function ComingSoonSettingsModule() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [customHtml, setCustomHtml] = useState('');
  const [title, setTitle] = useState('Coming Soon');
  const [description, setDescription] = useState('We are working on something amazing');
  const [contactEmail, setContactEmail] = useState('info@dentalmanager.com');
  const [contactPhone, setContactPhone] = useState('+1 (234) 567-890');
  const [showPreview, setShowPreview] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('coming_soon_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        setIsEnabled(data.is_enabled || false);
        setCustomHtml(data.custom_html || '');
        setTitle(data.title || 'Coming Soon');
        setDescription(data.description || 'We are working on something amazing');
        setContactEmail(data.contact_email || 'info@dentalmanager.com');
        setContactPhone(data.contact_phone || '+1 (234) 567-890');
      } else {
        await initializeSettings();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      alert('Failed to load settings. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const initializeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('coming_soon_settings')
        .insert({
          is_enabled: false,
          title: 'Coming Soon',
          description: 'We are working on something amazing',
          contact_email: 'info@dentalmanager.com',
          contact_phone: '+1 (234) 567-890',
          custom_html: ''
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        alert('Settings initialized successfully!');
      }
    } catch (error) {
      console.error('Error initializing settings:', error);
      alert('Failed to initialize settings. Make sure you are logged in as super admin.');
    }
  };

  const handleSave = async () => {
    if (!settingsId) {
      alert('Settings not initialized. Please click "Initialize Settings Now" button.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('coming_soon_settings')
        .update({
          is_enabled: isEnabled,
          custom_html: customHtml,
          title,
          description,
          contact_email: contactEmail,
          contact_phone: contactPhone
        })
        .eq('id', settingsId);

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(`Failed to save settings: ${error.message || 'Unknown error'}\n\nCheck console for details.`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    if (!confirm('Reset to default HTML template? This will overwrite your custom HTML.')) {
      return;
    }

    setCustomHtml(`<!-- Default Coming Soon Page -->
<div class="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center px-4">
  <div class="max-w-2xl w-full text-center">
    <!-- Logo/Icon -->
    <div class="flex justify-center mb-8">
      <div class="w-24 h-24 bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
        <svg class="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    </div>

    <!-- Main Content -->
    <h1 class="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
      ${title}
    </h1>

    <p class="text-xl md:text-2xl text-gray-600 mb-8">
      ${description}
    </p>

    <div class="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
      <p class="text-lg text-gray-700 mb-6">
        Our comprehensive dental clinic management system is under development.
        We are building a powerful platform to help dental practices manage their operations efficiently.
      </p>

      <div class="grid md:grid-cols-3 gap-6 mb-8">
        <div class="p-4">
          <div class="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-2">Patient Management</h3>
          <p class="text-sm text-gray-600">Complete patient records and history</p>
        </div>

        <div class="p-4">
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-2">Appointments</h3>
          <p class="text-sm text-gray-600">Smart scheduling and reminders</p>
        </div>

        <div class="p-4">
          <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-2">Billing & Invoicing</h3>
          <p class="text-sm text-gray-600">Automated financial management</p>
        </div>
      </div>

      <!-- Contact Section -->
      <div class="border-t border-gray-200 pt-6">
        <p class="text-gray-700 mb-4 font-medium">
          Interested in early access?
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="mailto:${contactEmail}" class="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>${contactEmail}</span>
          </a>
          <span class="hidden sm:block text-gray-300">|</span>
          <a href="tel:${contactPhone.replace(/\s/g, '')}" class="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>${contactPhone}</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <p class="text-gray-500 text-sm">
      © ${new Date().getFullYear()} Dental Management System. All rights reserved.
    </p>
  </div>
</div>`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!settingsId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 text-yellow-600">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-yellow-900 mb-2">Settings Not Initialized</h2>
              <p className="text-yellow-700 mb-4">
                The coming soon settings have not been initialized yet. This can happen if:
              </p>
              <ul className="list-disc list-inside text-yellow-700 mb-4 space-y-1">
                <li>The database migration hasn't been run</li>
                <li>You don't have super admin permissions</li>
                <li>The settings record was deleted</li>
              </ul>
              <button
                onClick={initializeSettings}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Initialize Settings Now
              </button>
              <p className="text-xs text-yellow-600 mt-2">
                If this fails, check the browser console (F12) for error details.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Coming Soon Page Settings</h1>
        <p className="text-gray-600">
          Configure the coming soon page that visitors see when accessing the main domain
        </p>
      </div>

      {isEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-green-600 mt-0.5">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-900">Coming Soon page is enabled</p>
              <p className="text-sm text-green-700 mt-1">
                Visitors to your main domain will see the coming soon page. Subdomains will continue to work normally.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-blue-600 mt-0.5">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-blue-900">Coming Soon page is disabled</p>
              <p className="text-sm text-blue-700 mt-1">
                Main domain will show the normal app. Enable the coming soon page to hide the app from public view.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Page Configuration</h2>
                <p className="text-sm text-gray-600">Toggle and customize your coming soon page</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-900">Enable Coming Soon Page</label>
              <p className="text-xs text-gray-600 mt-1">Show coming soon page on main domain</p>
            </div>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-sky-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Page Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Coming Soon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Meta Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="We are working on something amazing"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="info@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Contact Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="+1 (234) 567-890"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                <Code className="w-4 h-4 inline mr-1" />
                Custom HTML
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleResetDefault}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Default
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-3 py-1 text-sm text-sky-600 hover:text-sky-700 border border-sky-300 rounded-lg hover:bg-sky-50 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              You can use full HTML, CSS (Tailwind classes work), and inline styles. Variables: title, description, contactEmail, contactPhone
            </p>
            <textarea
              value={customHtml}
              onChange={(e) => setCustomHtml(e.target.value)}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
              placeholder="Enter custom HTML..."
            />
          </div>

          {showPreview && customHtml && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Eye className="w-4 h-4 inline mr-1" />
                Live Preview
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div
                  dangerouslySetInnerHTML={{ __html: customHtml }}
                  className="bg-white"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 text-yellow-600 mt-0.5">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-yellow-900">Important Notes</p>
            <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
              <li>Coming soon page only affects the main domain (e.g., dentalmanager.com)</li>
              <li>Subdomains (e.g., clinic-a.dentalmanager.com) always show the app</li>
              <li>Super admins can always access the app even when coming soon is enabled</li>
              <li>Use Tailwind CSS classes or inline styles in your custom HTML</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
