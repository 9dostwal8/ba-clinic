// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { printInvoice } from '../../utils/invoicePdfGenerator';
import {
  Printer,
  CreditCard,
  Users,
  UserPlus,
  Activity,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Briefcase,
  User,
  ArrowUpCircle,
  Building2,
  X,
  Smartphone,
  Monitor,
  Settings,
  MessageCircle,
  Mail,
  Phone
} from 'lucide-react';

interface SubscriptionInfo {
  subscription_status: string;
  subscription_start: string;
  subscription_end: string;
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

interface AppSettings {
  web_app_enabled: boolean;
  mobile_app_enabled: boolean;
}

interface BillingSettings {
  billing_type: 'per_treatment' | 'per_patient' | 'per_month';
  unit_price: number;
  monthly_price?: number;
  currency: string;
  model_name: string;
  source?: string;
  plan_limits?: Record<string, number | null>;
}

interface UsageStats {
  current_month_treatments: number;
  current_month_patients: number;
  total_staff: number;
  total_patients: number;
  estimated_amount: number;
}

export default function ClinicSubscriptionModule() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState({ start: '', end: '' });
  const [currentClinicType, setCurrentClinicType] = useState<ClinicType | null>(null);
  const [availableClinicTypes, setAvailableClinicTypes] = useState<ClinicType[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ web_app_enabled: true, mobile_app_enabled: false });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradeType, setSelectedUpgradeType] = useState<string | null>(null);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [adminContact, setAdminContact] = useState({ whatsapp: '', email: '', phone: '' });
  const [subscriptionInvoices, setSubscriptionInvoices] = useState<any[]>([]);
  const [printingInvoice, setPrintingInvoice] = useState<string | null>(null);


  useEffect(() => {
    console.log('Profile clinic_id:', profile?.clinic_id);
    if (profile?.clinic_id) {
      loadSubscriptionData();
    } else {
      console.warn('No clinic_id found for profile');
      setLoading(false);
    }
  }, [profile?.clinic_id]);

  const loadSubscriptionData = async () => {
    setLoading(true);
    try {
      await loadSubscriptionInfo();
      const settings = await loadBillingSettings();
      await loadUsageStats(settings);
      await loadClinicType();
      await loadAvailableClinicTypes();
      await loadAppSettings();
      await loadAdminContact();
      await loadSubscriptionInvoices();
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionInfo = async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select('subscription_status, subscription_start, subscription_end, clinic_type_id')
      .eq('id', profile?.clinic_id)
      .single();

    if (error) {
      console.error('Error loading subscription info:', error);
    }
    if (data) {
      console.log('Subscription info loaded:', data);
      setSubscriptionInfo(data);
    }
  };

  const loadClinicType = async () => {
    const { data, error } = await supabase
      .from('clinics')
      .select('clinic_type_id, clinic_types(*)')
      .eq('id', profile?.clinic_id)
      .single();

    if (error) {
      console.error('Error loading clinic type:', error);
      return;
    }

    if (data && data.clinic_types) {
      setCurrentClinicType(data.clinic_types as unknown as ClinicType);
    }
  };

  const loadAvailableClinicTypes = async () => {
    const { data, error } = await supabase
      .from('clinic_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error loading available clinic types:', error);
      return;
    }

    setAvailableClinicTypes(data || []);
  };

  const loadAppSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['web_app_enabled', 'mobile_app_enabled']);

    if (error) {
      console.error('Error loading app settings:', error);
      return;
    }

    if (data && data.length > 0) {
      const settings: any = {};
      data.forEach((item: any) => {
        settings[item.setting_key] = item.setting_value === true || item.setting_value === 'true';
      });
      setAppSettings({
        web_app_enabled: settings.web_app_enabled ?? true,
        mobile_app_enabled: settings.mobile_app_enabled ?? false
      });
    }
  };

  const loadAdminContact = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['support_whatsapp', 'support_email', 'support_phone']);

      console.log('loadAdminContact - raw data:', data);
      console.log('loadAdminContact - error:', error);

      if (error) {
        console.error('Error loading admin contact:', error);
        return;
      }

      if (data && data.length > 0) {
        const contact: any = { whatsapp: '', email: '', phone: '' };

        data.forEach((item: any) => {
          console.log('Processing item:', item.setting_key, '=', item.setting_value, 'type:', typeof item.setting_value);

          let value = item.setting_value;

          if (typeof value === 'string') {
            value = value.trim();
          } else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value).replace(/^"|"$/g, '');
          } else {
            value = String(value || '');
          }

          value = value.replace(/^["']|["']$/g, '').trim();

          console.log('Parsed value for', item.setting_key, '=', value);

          if (item.setting_key === 'support_whatsapp') contact.whatsapp = value;
          if (item.setting_key === 'support_email') contact.email = value;
          if (item.setting_key === 'support_phone') contact.phone = value;
        });

        console.log('Final contact object:', contact);
        setAdminContact(contact);
      } else {
        console.warn('No admin contact data returned from database');
      }
    } catch (err) {
      console.error('Exception in loadAdminContact:', err);
    }
  };

  const loadBillingSettings = async () => {
    // 1) Preferred source: subscription assigned by the super admin
    const { data: eff, error: effErr } = await supabase
      .rpc('get_clinic_effective_billing', { p_clinic_id: profile?.clinic_id });

    if (effErr) console.error('Error loading effective billing:', effErr);

    const row: any = Array.isArray(eff) ? eff[0] : eff;
    if (row) {
      const settings: BillingSettings = {
        billing_type: (row.billing_mode || 'per_month') as any,
        unit_price: Number(row.unit_price || 0),
        monthly_price: Number(row.price_monthly || 0),
        currency: row.currency || 'IQD',
        model_name: row.plan_name || 'Subscription',
        source: row.source || 'subscription',
        plan_limits: {
          max_dentists: row.max_dentists,
          max_staff: row.max_staff,
          max_receptionists: row.max_receptionists,
          max_patients: row.max_patients,
          max_appointments_per_month: row.max_appointments_per_month,
        },
      };
      setBillingSettings(settings);
      return settings;
    }

    // 2) Fallback: legacy per-clinic billing model
    const { data, error } = await supabase
      .from('clinic_billing_settings')
      .select(`
        custom_price_per_unit,
        billing_model:billing_models(
          model_name,
          billing_type,
          default_price_per_unit,
          currency
        )
      `)
      .eq('clinic_id', profile?.clinic_id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error loading billing settings:', error);
      return null;
    }
    if (data) {
      const model = data.billing_model as any;
      const settings: BillingSettings = {
        billing_type: model.billing_type,
        unit_price: parseFloat(data.custom_price_per_unit || model.default_price_per_unit),
        currency: model.currency,
        model_name: model.model_name,
        source: 'billing_model',
      };
      setBillingSettings(settings);
      return settings;
    }
    return null;
  };

  const loadUsageStats = async (currentBillingSettings?: BillingSettings | null) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const periodStart = startOfMonth.toISOString().split('T')[0];
    const periodEnd = endOfMonth.toISOString().split('T')[0];

    setCurrentPeriod({ start: periodStart, end: periodEnd });

    const [treatmentRows, invoiceItemsResult, patientsResult, staffResult, totalPatientsResult] = await Promise.all([
      supabase
        .from('treatments')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', profile?.clinic_id)
        .gte('treatment_date', periodStart)
        .lte('treatment_date', periodEnd),

      supabase
        .from('invoices')
        .select('items')
        .eq('clinic_id', profile?.clinic_id)
        .gte('invoice_date', periodStart)
        .lte('invoice_date', periodEnd),

      supabase
        .from('invoices')
        .select('patient_id')
        .eq('clinic_id', profile?.clinic_id)
        .gte('invoice_date', periodStart)
        .lte('invoice_date', periodEnd),

      supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('clinic_id', profile?.clinic_id)
        .neq('role', 'clinic_admin'),

      supabase
        .from('patients')
        .select('id', { count: 'exact' })
        .eq('clinic_id', profile?.clinic_id)
    ]);

    let treatmentCount = treatmentRows.count || 0;
    if (!treatmentCount && invoiceItemsResult.data) {
      invoiceItemsResult.data.forEach((invoice: any) => {
        if (invoice.items && Array.isArray(invoice.items)) {
          treatmentCount += invoice.items.length;
        }
      });
    }

    const uniquePatients = new Set(patientsResult.data?.map((p: any) => p.patient_id) || []);
    const patientCount = uniquePatients.size;

    const stats: UsageStats = {
      current_month_treatments: treatmentCount,
      current_month_patients: patientCount,
      total_staff: staffResult.count || 0,
      total_patients: totalPatientsResult.count || 0,
      estimated_amount: 0
    };

    const settingsToUse = currentBillingSettings || billingSettings;
    if (settingsToUse) {
      if (settingsToUse.billing_type === 'per_treatment') {
        stats.estimated_amount = treatmentCount * settingsToUse.unit_price;
      } else if (settingsToUse.billing_type === 'per_patient') {
        stats.estimated_amount = patientCount * settingsToUse.unit_price;
      } else {
        stats.estimated_amount = settingsToUse.monthly_price || settingsToUse.unit_price || 0;
      }
    }


    setUsageStats(stats);
  };

  const loadSubscriptionInvoices = async () => {
    const { data, error } = await supabase
      .from('clinic_monthly_invoices')
      .select('*')
      .eq('clinic_id', profile?.clinic_id)
      .neq('status', 'cancelled')
      .order('issued_date', { ascending: false });

    if (error) {
      console.error('Error loading subscription invoices:', error);
      return;
    }
    setSubscriptionInvoices(data || []);
  };

  const handlePrintSubscriptionInvoice = async (invoice: any) => {
    setPrintingInvoice(invoice.id);
    try {
      const { data: items, error } = await supabase
        .from('clinic_invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      if (error) throw error;
      printInvoice({ ...invoice, items: items || [] });
    } catch (err: any) {
      console.error('Print failed:', err);
      alert('Print failed: ' + err.message);
    } finally {
      setPrintingInvoice(null);
    }
  };

  const invoiceStatusTone = (status: string) => {
    switch (status) {
      case 'paid':
        return 'border-status-done/30 bg-status-done/10 text-status-done';
      case 'sent':
        return 'border-status-planned/30 bg-status-planned/10 text-status-planned';
      case 'overdue':
        return 'border-destructive/30 bg-destructive/10 text-destructive';
      default:
        return 'border-border bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      active: { bg: 'bg-green-100 text-green-800', text: t('status_active') || 'Active', icon: CheckCircle },
      trial: { bg: 'bg-blue-100 text-blue-800', text: t('status_trial') || 'Trial', icon: Clock },
      expired: { bg: 'bg-red-100 text-red-800', text: t('status_expired') || 'Expired', icon: AlertCircle },
      suspended: { bg: 'bg-yellow-100 text-yellow-800', text: t('status_suspended') || 'Suspended', icon: AlertCircle }
    };

    const badge = badges[status] || badges.active;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.bg}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`;
  };

  const handleUpgradeRequest = async () => {
    if (!selectedUpgradeType) return;
    await loadAdminContact();
    setShowContactDialog(true);
  };

  const handleWhatsAppContact = () => {
    const selectedType = availableClinicTypes.find(t => t.id === selectedUpgradeType);
    const message = encodeURIComponent(
      `${t('hello') || 'Hello'}, ${t('upgradeRequestMessage') || 'I would like to upgrade my clinic subscription'}\n\n` +
      `${tt('clinicTypes.currentType','Current plan')}: ${currentClinicType?.name}\n` +
      `${t('upgradeToType') || 'Upgrade to'}: ${selectedType?.name}\n\n` +
      `${t('clinic_name') || 'Clinic'}: ${profile?.clinic_id}`
    );
    window.open(`https://wa.me/${adminContact.whatsapp}?text=${message}`, '_blank');
  };

  const handleEmailContact = () => {
    const selectedType = availableClinicTypes.find(t => t.id === selectedUpgradeType);
    const subject = encodeURIComponent(t('upgradeRequestSubject') || 'Subscription Upgrade Request');
    const body = encodeURIComponent(
      `${t('hello') || 'Hello'},\n\n` +
      `${t('upgradeRequestMessage') || 'I would like to upgrade my clinic subscription'}\n\n` +
      `${tt('clinicTypes.currentType','Current plan')}: ${currentClinicType?.name}\n` +
      `${t('upgradeToType') || 'Upgrade to'}: ${selectedType?.name}\n\n` +
      `${t('clinic_name') || 'Clinic'}: ${profile?.clinic_id}\n\n` +
      `${t('thankYou') || 'Thank you'}`
    );
    window.location.href = `mailto:${adminContact.email}?subject=${subject}&body=${body}`;
  };

  const handlePhoneContact = () => {
    window.location.href = `tel:${adminContact.phone}`;
  };

  const getDaysUntilExpiry = () => {
    if (!subscriptionInfo?.subscription_end) return null;
    const end = new Date(subscriptionInfo.subscription_end);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Safe translate: falls back when the key is missing (t() echoes the key).
  const tt = (key: string, fallback: string) => {
    const v = t(key);
    return !v || v === key || v.includes('.') ? fallback : v;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!profile?.clinic_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{tt('no_clinic_access', 'No clinic access found')}</p>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntilExpiry();
  const mode = billingSettings?.billing_type || 'per_month';
  const modeLabel =
    mode === 'per_treatment'
      ? tt('per_treatment', 'Per treatment')
      : mode === 'per_patient'
        ? tt('per_patient', 'Per patient')
        : tt('per_month', 'Per month');
  const rate =
    mode === 'per_month' ? billingSettings?.monthly_price || 0 : billingSettings?.unit_price || 0;
  const currency = billingSettings?.currency || 'IQD';
  const usedUnits =
    mode === 'per_treatment'
      ? usageStats?.current_month_treatments || 0
      : mode === 'per_patient'
        ? usageStats?.current_month_patients || 0
        : 1;
  const statusKey = subscriptionInfo?.subscription_status || 'active';
  const statusTone =
    statusKey === 'active'
      ? 'bg-status-done/15 text-status-done border-status-done/30'
      : statusKey === 'trial'
        ? 'bg-status-planned/15 text-status-planned border-status-planned/30'
        : 'bg-destructive/15 text-destructive border-destructive/30';

  const summaryTiles = [
    {
      icon: Briefcase,
      label: tt('treatments', 'Treatments this month'),
      value: formatNumber(usageStats?.current_month_treatments || 0),
    },
    {
      icon: User,
      label: tt('patients', 'Patients billed this month'),
      value: formatNumber(usageStats?.current_month_patients || 0),
    },
    {
      icon: Users,
      label: tt('total_staff', 'Total staff'),
      value: formatNumber(usageStats?.total_staff || 0),
    },
    {
      icon: UserPlus,
      label: tt('total_patients', 'Total patients'),
      value: formatNumber(usageStats?.total_patients || 0),
    },
  ];

  return (
    <div className={`space-y-5 pb-8 ${isRTL ? 'rtl' : 'ltr'}`}>

      {/* Hero */}
      <div className="rounded-3xl bg-primary text-primary-foreground p-5 sm:p-7 shadow-lift">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/10">
              <Package className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="eyebrow text-primary-foreground/60">{tt('subscription', 'Subscription')}</p>
              <h2 className="truncate font-display text-2xl font-bold sm:text-3xl">
                {billingSettings?.model_name || tt('subscription_plan', 'Subscription plan')}
              </h2>
              <p className="mt-1 text-sm text-primary-foreground/70">
                {tt('subscription_subtitle', 'Your plan, usage and monthly bill at a glance')}
              </p>
            </div>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
            <CheckCircle className="h-3.5 w-3.5" />
            {statusKey}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-primary-foreground/8 p-4 ring-1 ring-primary-foreground/10">
            <p className="eyebrow text-primary-foreground/50">{tt('billing_type', 'Billing mode')}</p>
            <p className="mt-1 text-lg font-semibold">{modeLabel}</p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/8 p-4 ring-1 ring-primary-foreground/10">
            <p className="eyebrow text-primary-foreground/50">{tt('unit_price', 'Rate')}</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(rate, currency)}</p>
          </div>
          <div className="rounded-2xl bg-accent p-4 text-accent-foreground">
            <p className="eyebrow opacity-70">{tt('estimated_bill', 'Estimated bill')}</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {formatCurrency(usageStats?.estimated_amount || 0, currency)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {tt('upgrade_plan', 'Upgrade plan')}
          </button>
          <p className="text-xs text-primary-foreground/60">
            {formatDate(currentPeriod.start)} — {formatDate(currentPeriod.end)}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-status-progress/30 bg-status-progress/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-status-progress" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{tt('subscriptionExpiringSoon', 'Subscription expiring soon')}</span>
            {' — '}
            {daysUntilExpiry} {tt('days', 'days')} {tt('daysRemaining', 'remaining')}
          </p>
        </div>
      )}

      {statusKey === 'suspended' && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          <p className="text-sm text-foreground">
            {tt('subscriptionSuspendedMessage', 'Your subscription is suspended. Contact support to reactivate.')}
          </p>
        </div>
      )}

      {/* Usage tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryTiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-border bg-card p-4 shadow-panel">
            <div className="flex items-center gap-2 text-muted-foreground">
              <tile.icon className="h-4 w-4 shrink-0" />
              <span className="truncate text-xs">{tile.label}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* This month's bill */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">{tt('current_month_usage', 'This month')}</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{tt('billing_period', 'Billing period')}</span>
              <span className="font-medium">{formatDate(currentPeriod.start)} — {formatDate(currentPeriod.end)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{modeLabel}</span>
              <span className="font-medium">
                {mode === 'per_month'
                  ? tt('flat_monthly_fee', 'Flat monthly fee')
                  : `${formatNumber(usedUnits)} × ${formatCurrency(rate, currency)}`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3">
              <span className="font-semibold">{tt('estimated_bill', 'Estimated bill')}</span>
              <span className="font-display text-xl font-bold">
                {formatCurrency(usageStats?.estimated_amount || 0, currency)}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {mode === 'per_treatment'
                ? `You are charged ${formatCurrency(rate, currency)} for every treatment performed. The monthly bill equals treatments × rate.`
                : mode === 'per_patient'
                  ? `You are charged ${formatCurrency(rate, currency)} for every unique patient invoiced this month.`
                  : `You pay a flat ${formatCurrency(rate, currency)} each month for the ${billingSettings?.model_name || 'current'} plan.`}
            </p>
          </div>
        </div>

        {/* Plan details */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-panel">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">{tt('subscription_plan', 'Plan details')}</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-muted p-4">
              <p className="eyebrow text-muted-foreground">{tt('subscription_plan', 'Subscription plan')}</p>
              <p className="mt-1 text-base font-semibold">
                {billingSettings?.model_name || tt('no_plan_assigned', 'No plan assigned')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {modeLabel} · {mode === 'per_month'
                  ? formatCurrency(rate, currency)
                  : `${formatCurrency(rate, currency)} / ${mode === 'per_patient' ? tt('patient', 'patient') : tt('treatment', 'treatment')}`}
              </p>
              {currentClinicType?.name && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {tt('clinic_type', 'Clinic type')}: <span className="font-medium text-foreground">{currentClinicType.name}</span>
                </p>
              )}
            </div>


            {billingSettings?.plan_limits && (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(billingSettings.plan_limits)
                  .filter(([, v]) => v !== null && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-border p-3">
                      <p className="truncate text-xs capitalize text-muted-foreground">{k.replace(/_/g, ' ')}</p>
                      <p className="font-display text-lg font-bold">{formatNumber(Number(v))}</p>
                    </div>
                  ))}
              </div>
            )}

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tt('start_date', 'Start date')}</span>
                <span className="font-medium">{formatDate(subscriptionInfo?.subscription_start || null)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{tt('end_date', 'End date')}</span>
                <span className="font-medium">{formatDate(subscriptionInfo?.subscription_end || null)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${appSettings.web_app_enabled ? 'border-status-done/30 bg-status-done/10 text-status-done' : 'border-border bg-muted text-muted-foreground'}`}>
                <Monitor className="h-3.5 w-3.5" />
                {tt('webApp', 'Web app')} · {appSettings.web_app_enabled ? tt('enabled', 'enabled') : tt('disabled', 'disabled')}
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${appSettings.mobile_app_enabled ? 'border-status-planned/30 bg-status-planned/10 text-status-planned' : 'border-border bg-muted text-muted-foreground'}`}>
                <Smartphone className="h-3.5 w-3.5" />
                {tt('mobileApp', 'Mobile app')} · {appSettings.mobile_app_enabled ? tt('enabled', 'enabled') : tt('disabled', 'disabled')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription invoices from the platform */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">
              {tt('subscription_invoices', 'Subscription invoices')}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {tt('subscription_invoices_hint', 'Invoices sent to your clinic by the platform')}
          </p>
        </div>

        {subscriptionInvoices.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
            {tt('no_subscription_invoices', 'No subscription invoices yet.')}
          </p>
        ) : (
          <div className="space-y-3">
            {subscriptionInvoices.map((invoice) => {
              const isPaid = invoice.status === 'paid';
              const isOverdue =
                !isPaid && invoice.due_date && new Date(invoice.due_date) < new Date();
              return (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{invoice.invoice_number}</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${invoiceStatusTone(
                          isOverdue ? 'overdue' : invoice.status
                        )}`}
                      >
                        {isOverdue ? tt('overdue', 'Overdue') : invoice.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(invoice.billing_period_start)} — {formatDate(invoice.billing_period_end)}
                      {invoice.due_date && (
                        <>
                          {' · '}
                          {tt('due_date', 'Due')}: {formatDate(invoice.due_date)}
                        </>
                      )}
                    </p>
                  </div>
                  <p className="font-display text-lg font-bold">
                    {formatCurrency(Number(invoice.total_amount || 0), invoice.currency || currency)}
                  </p>
                  <button
                    onClick={() => handlePrintSubscriptionInvoice(invoice)}
                    disabled={printingInvoice === invoice.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted disabled:opacity-50"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {printingInvoice === invoice.id ? tt('loading', 'Loading…') : tt('print', 'Print')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                  <ArrowUpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('upgradeSubscription') || 'Upgrade Your Subscription'}</h2>
                  <p className="text-blue-100 text-sm">{t('upgradeSubtitle') || 'Choose a plan that fits your needs'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedUpgradeType(null);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Current Plan Info */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">{t('currentPlan') || 'Current Plan'}</p>
                    <p className="text-xl font-bold text-purple-900">
                      {currentClinicType?.name || tt('clinicTypes.clinic','Clinic')}
                    </p>
                  </div>
                </div>
                {currentClinicType && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{tt('clinicTypes.dentists','Dentists')}</p>
                      <p className="text-sm font-bold text-gray-900">{currentClinicType.min_dentists}-{currentClinicType.max_dentists}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{tt('clinicTypes.receptionists','Receptionists')}</p>
                      <p className="text-sm font-bold text-gray-900">{currentClinicType.min_receptionists}-{currentClinicType.max_receptionists}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('subscription') || 'Subscription'}</p>
                      <p className="text-sm font-bold text-green-700">{billingSettings?.model_name || '—'}</p>
                    </div>

                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600">{t('status') || 'Status'}</p>
                      <p className="text-sm font-bold text-green-700">{t('active') || 'Active'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Available Plans */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableClinicTypes.map((type) => {
                  const isCurrent = currentClinicType?.id === type.id;
                  const isUpgrade = type.display_order > (currentClinicType?.display_order || 0);

                  return (
                    <div
                      key={type.id}
                      className={`border-2 rounded-xl p-5 transition-all cursor-pointer ${
                        selectedUpgradeType === type.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : isCurrent
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                      } ${isCurrent ? 'opacity-75' : ''}`}
                      onClick={() => !isCurrent && setSelectedUpgradeType(type.id)}
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
                        {isUpgrade && !isCurrent && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                            {t('upgrade') || 'Upgrade'}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{tt('clinicTypes.dentists','Dentists')}:</span>
                          <span className="font-medium">{type.min_dentists}-{type.max_dentists}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{tt('clinicTypes.receptionists','Receptionists')}:</span>
                          <span className="font-medium">{type.min_receptionists}-{type.max_receptionists}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{tt('clinicTypes.cleaners','Cleaners')}:</span>
                          <span className="font-medium">{type.min_cleaners}-{type.max_cleaners}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{tt('clinicTypes.workers','Workers')}:</span>
                          <span className="font-medium">{type.min_workers}-{type.max_workers}</span>
                        </div>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{t('billing') || 'Billing'}:</span>
                          <span className="text-sm font-semibold text-gray-700">
                            {t('per_assigned_subscription') || 'Per assigned subscription'}
                          </span>
                        </div>
                      </div>


                      {selectedUpgradeType === type.id && !isCurrent && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 text-blue-700">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-medium">{t('selected') || 'Selected'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subscription Information */}
              <div className="mt-6 bg-gray-50 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-3">{t('subscriptionInformation') || 'Subscription Information'}</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('expirationDate') || 'Expiration Date'}</p>
                        <p className="font-medium text-gray-900">{formatDate(subscriptionInfo?.subscription_end || null)}</p>
                        {daysUntilExpiry !== null && (
                          <p className="text-xs text-amber-600 mt-1">
                            {daysUntilExpiry > 0 ? `${daysUntilExpiry} ${t('daysRemaining') || 'days remaining'}` : t('expired') || 'Expired'}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('subscriptionStatus') || 'Status'}</p>
                        <div className="flex items-center gap-2">
                          {subscriptionInfo && getStatusBadge(subscriptionInfo.subscription_status)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        <Monitor className={`w-8 h-8 ${appSettings.web_app_enabled ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="text-xs text-gray-600">{t('webApp') || 'Web App'}</p>
                          <p className="font-medium text-sm">{appSettings.web_app_enabled ? t('enabled') : t('disabled')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Smartphone className={`w-8 h-8 ${appSettings.mobile_app_enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="text-xs text-gray-600">{t('mobileApp') || 'Mobile App'}</p>
                          <p className="font-medium text-sm">{appSettings.mobile_app_enabled ? t('enabled') : t('disabled')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleUpgradeRequest}
                  disabled={!selectedUpgradeType || selectedUpgradeType === currentClinicType?.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  {t('requestUpgrade') || 'Request Upgrade'}
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedUpgradeType(null);
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('cancel') || 'Cancel'}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                {t('upgradeNote') || 'An administrator will review your request and contact you to complete the upgrade process.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contact Administration Dialog */}
      {showContactDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">{t('contactAdministration') || 'Contact Administration'}</h2>
                <p className="text-green-100 text-sm mt-1">{t('chooseContactMethod') || 'Choose how to contact us'}</p>
              </div>
              <button
                onClick={() => setShowContactDialog(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {t('selectedPlanUpgrade') || 'Selected plan'}:
                    <span className="font-bold ml-2">
                      {availableClinicTypes.find(t => t.id === selectedUpgradeType)?.name}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">



                {adminContact.whatsapp && (
                  <button
                    onClick={handleWhatsAppContact}
                    className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-xl transition-all group"
                  >
                    <div className="bg-green-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{t('contactViaWhatsApp') || 'Contact via WhatsApp'}</p>
                      <p className="text-sm text-gray-600">{adminContact.whatsapp}</p>
                    </div>
                  </button>
                )}

                {adminContact.email && (
                  <button
                    onClick={handleEmailContact}
                    className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 rounded-xl transition-all group"
                  >
                    <div className="bg-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{t('contactViaEmail') || 'Contact via Email'}</p>
                      <p className="text-sm text-gray-600">{adminContact.email}</p>
                    </div>
                  </button>
                )}

                {adminContact.phone && (
                  <button
                    onClick={handlePhoneContact}
                    className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-xl transition-all group"
                  >
                    <div className="bg-purple-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900">{t('contactViaPhone') || 'Contact via Phone'}</p>
                      <p className="text-sm text-gray-600">{adminContact.phone}</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowContactDialog(false)}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  {t('close') || 'Close'}
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 mt-4">
                {t('upgradeContactNote') || 'Our team will assist you with the upgrade process'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
