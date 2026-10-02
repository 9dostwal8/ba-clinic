// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ComingSoonSettings {
  custom_html: string;
  title: string;
  description: string;
}

export function ComingSoonPage() {
  const [settings, setSettings] = useState<ComingSoonSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('coming_soon_settings')
        .select('custom_html, title, description')
        .eq('is_enabled', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        if (data.title) {
          document.title = data.title;
        }
        if (data.description) {
          let metaDescription = document.querySelector('meta[name="description"]');
          if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
          }
          metaDescription.setAttribute('content', data.description);
        }
      }
    } catch (error) {
      console.error('Error fetching coming soon settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (settings?.custom_html) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: settings.custom_html }}
        style={{ minHeight: '100vh' }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          Coming Soon
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-8">
          We are working on something amazing
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <p className="text-lg text-gray-700 mb-6">
            Our comprehensive dental clinic management system is under development.
            We are building a powerful platform to help dental practices manage their operations efficiently.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-4">
              <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Patient Management</h3>
              <p className="text-sm text-gray-600">Complete patient records and history</p>
            </div>

            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Appointments</h3>
              <p className="text-sm text-gray-600">Smart scheduling and reminders</p>
            </div>

            <div className="p-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Billing & Invoicing</h3>
              <p className="text-sm text-gray-600">Automated financial management</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <p className="text-gray-700 mb-4 font-medium">
              Interested in early access?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="mailto:info@dentalmanager.com"
                className="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>info@dentalmanager.com</span>
              </a>
              <span className="hidden sm:block text-gray-300">|</span>
              <a
                href="tel:+1234567890"
                className="flex items-center gap-2 text-sky-600 hover:text-sky-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+1 (234) 567-890</span>
              </a>
            </div>
          </div>
        </div>

        <p className="text-gray-500 text-sm">
          © {new Date().getFullYear()} Dental Management System. All rights reserved.
        </p>
      </div>
    </div>
  );
}
