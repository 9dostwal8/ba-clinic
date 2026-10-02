// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Copy, ExternalLink, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { MD3Card } from '../MD3Components';

interface WhatsAppReminder {
  id: string;
  appointment_id: string;
  patient_phone: string;
  message_content: string;
  whatsapp_link: string;
  status: 'pending' | 'sent' | 'clicked' | 'failed';
  sent_at: string | null;
  created_at: string;
  patients: {
    full_name: string;
  };
  appointments: {
    appointment_date: string;
    appointment_time: string;
  };
}

export function WhatsAppRemindersModule() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [reminders, setReminders] = useState<WhatsAppReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadReminders();
  }, [profile?.clinic_id]);

  const loadReminders = async () => {
    if (!profile?.clinic_id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('whatsapp_reminders')
        .select(`
          *,
          patients!whatsapp_reminders_patient_id_fkey(full_name),
          appointments!whatsapp_reminders_appointment_id_fkey(appointment_date, appointment_time)
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTomorrowReminders = async () => {
    try {
      setGenerating(true);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Please log in to continue');
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/whatsapp-free-reminder?mode=check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        const message = result.count === 0
          ? t('whatsapp.reminders.noAppointments', `No appointments found for tomorrow`)
          : t('whatsapp.reminders.generated', `Generated ${result.count} reminder(s) successfully`);
        alert(message);
        loadReminders();
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error generating reminders:', error);
      const errorMessage = error?.message || 'Failed to generate reminders. Please try again.';
      alert(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const openWhatsApp = (link: string) => {
    window.open(link, '_blank');
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      alert(t('whatsapp.reminders.copied', 'Link copied to clipboard!'));
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link. Please try again.');
    }
  };

  const markAsSent = async (reminderId: string, appointmentId: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('Please log in to continue');
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/whatsapp-free-reminder?mode=send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ appointmentId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        loadReminders();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error marking as sent:', error);
      alert('Failed to update reminder status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'clicked':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('whatsapp.reminders.pending', 'Pending');
      case 'sent':
        return t('whatsapp.reminders.sent', 'Sent');
      case 'clicked':
        return t('whatsapp.reminders.clicked', 'Clicked');
      case 'failed':
        return t('whatsapp.reminders.failed', 'Failed');
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            {t('whatsapp.reminders.title', 'WhatsApp Reminders')}
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadReminders}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh', 'Refresh')}
          </button>
          <button
            onClick={generateTomorrowReminders}
            disabled={generating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            {generating ? t('common.processing', 'Processing...') : t('whatsapp.reminders.generateTomorrow', 'Generate Tomorrow Reminders')}
          </button>
        </div>
      </div>

      <div className="flex gap-3 border-b border-gray-200">
        {['all', 'pending', 'sent'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status);
              setTimeout(loadReminders, 100);
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              filterStatus === status
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {status === 'all' ? t('common.all', 'All') : getStatusText(status)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {reminders.length === 0 ? (
          <MD3Card>
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {t('whatsapp.reminders.noReminders', 'No reminders found. Click "Generate Tomorrow Reminders" to create reminders for upcoming appointments.')}
              </p>
            </div>
          </MD3Card>
        ) : (
          reminders.map((reminder) => (
            <MD3Card key={reminder.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(reminder.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {reminder.patients?.full_name || 'Unknown Patient'}
                      </h3>
                      <p className="text-sm text-gray-600">{reminder.patient_phone}</p>
                    </div>
                  </div>

                  {reminder.appointments && (
                    <p className="text-sm text-gray-600 mb-3">
                      {t('appointment.date', 'Date')}: {new Date(reminder.appointments.appointment_date).toLocaleDateString()}
                      {' at '}
                      {reminder.appointments.appointment_time}
                    </p>
                  )}

                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {reminder.message_content}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{t('common.created', 'Created')}: {new Date(reminder.created_at).toLocaleString()}</span>
                    {reminder.sent_at && (
                      <>
                        <span>•</span>
                        <span>{t('common.sent', 'Sent')}: {new Date(reminder.sent_at).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {reminder.status === 'pending' && (
                    <button
                      onClick={() => {
                        openWhatsApp(reminder.whatsapp_link);
                        markAsSent(reminder.id, reminder.appointment_id);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Send className="w-4 h-4" />
                      {t('whatsapp.reminders.sendNow', 'Send Now')}
                    </button>
                  )}

                  <button
                    onClick={() => openWhatsApp(reminder.whatsapp_link)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 whitespace-nowrap"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t('whatsapp.reminders.openWhatsApp', 'Open WhatsApp')}
                  </button>

                  <button
                    onClick={() => copyLink(reminder.whatsapp_link)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Copy className="w-4 h-4" />
                    {t('whatsapp.reminders.copyLink', 'Copy Link')}
                  </button>
                </div>
              </div>
            </MD3Card>
          ))
        )}
      </div>
    </div>
  );
}
