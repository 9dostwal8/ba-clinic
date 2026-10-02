// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Activity,
  Calendar,
  CheckCircle,
  Languages,
  Database,
  Monitor,
  CreditCard,
  Cloud,
  FileText,
  Rocket,
  ChevronRight
} from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';

interface Stats {
  totalClinics: number;
  activeClinics: number;
  trialClinics: number;
  suspendedClinics: number;
  totalRevenue: number;
  pendingRevenue: number;
  monthlyRevenue: number;
  totalPatients: number;
  totalTreatments: number;
  totalInvoices: number;
}

interface RecentActivity {
  id: string;
  type: 'clinic_added' | 'invoice_paid' | 'subscription_renewed';
  clinic_name: string;
  amount?: number;
  timestamp: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  description: string;
  color: string;
}

interface SuperAdminOverviewModuleProps {
  onNavigate?: (moduleId: string) => void;
}

export default function SuperAdminOverviewModule({ onNavigate }: SuperAdminOverviewModuleProps) {
  const { currencySymbol } = useCurrency();
  const [stats, setStats] = useState<Stats>({
    totalClinics: 0,
    activeClinics: 0,
    trialClinics: 0,
    suspendedClinics: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    monthlyRevenue: 0,
    totalPatients: 0,
    totalTreatments: 0,
    totalInvoices: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentClinics, setRecentClinics] = useState<any[]>([]);

  const menuItems: MenuItem[] = [
    {
      id: 'clinics',
      label: 'Clinics',
      icon: Building2,
      description: 'Manage clinics',
      color: 'green'
    },
    {
      id: 'billing-models',
      label: 'Billing Models',
      icon: DollarSign,
      description: 'Configure billing',
      color: 'emerald'
    },
    {
      id: 'clinic-types',
      label: 'Clinic Types',
      icon: Users,
      description: 'Manage types',
      color: 'teal'
    },
    {
      id: 'billing-system',
      label: 'Billing System',
      icon: Activity,
      description: 'Usage & invoicing',
      color: 'orange'
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      icon: CreditCard,
      description: 'Manage plans',
      color: 'pink'
    },
    {
      id: 'translations',
      label: 'Translations',
      icon: Languages,
      description: 'Language settings',
      color: 'cyan'
    },
    {
      id: 'database',
      label: 'Database',
      icon: Database,
      description: 'Backup & restore',
      color: 'red'
    },
    {
      id: 'google-drive',
      label: 'Google Drive',
      icon: Cloud,
      description: 'Auto backup',
      color: 'sky'
    },
    {
      id: 'webapp',
      label: 'Web App',
      icon: Monitor,
      description: 'App settings',
      color: 'blue'
    },
    {
      id: 'coming-soon',
      label: 'Coming Soon',
      icon: Rocket,
      description: 'Landing page',
      color: 'orange'
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: FileText,
      description: 'Manage templates',
      color: 'green'
    }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; hover: string; icon: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', hover: 'hover:bg-blue-100', icon: 'text-blue-600' },
      green: { bg: 'bg-green-50', text: 'text-green-700', hover: 'hover:bg-green-100', icon: 'text-green-600' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', hover: 'hover:bg-emerald-100', icon: 'text-emerald-600' },
      orange: { bg: 'bg-green-50', text: 'text-green-700', hover: 'hover:bg-green-100', icon: 'text-green-600' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-700', hover: 'hover:bg-pink-100', icon: 'text-pink-600' },
      red: { bg: 'bg-red-50', text: 'text-red-700', hover: 'hover:bg-red-100', icon: 'text-red-600' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', hover: 'hover:bg-cyan-100', icon: 'text-cyan-600' },
      sky: { bg: 'bg-sky-50', text: 'text-sky-700', hover: 'hover:bg-sky-100', icon: 'text-sky-600' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-700', hover: 'hover:bg-teal-100', icon: 'text-teal-600' }
    };
    return colors[color] || colors.blue;
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const [clinicsRes, patientsRes, invoicesRes, monthlyInvoicesRes] = await Promise.all([
        supabase.from('clinics').select('subscription_status'),
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('items'),
        supabase.from('clinic_monthly_invoices').select('total_amount, status')
      ]);

      const clinics = clinicsRes.data || [];
      const totalClinics = clinics.length;
      const activeClinics = clinics.filter((c) => c.subscription_status === 'active').length;
      const trialClinics = clinics.filter((c) => c.subscription_status === 'trial').length;
      const suspendedClinics = clinics.filter((c) => c.subscription_status === 'suspended').length;

      const totalPatients = patientsRes.count || 0;

      const totalTreatments = (invoicesRes.data || []).reduce((sum, inv) => {
        const items = inv.items || [];
        return sum + (Array.isArray(items) ? items.length : 0);
      }, 0);

      const monthlyInvoices = monthlyInvoicesRes.data || [];
      const totalRevenue = monthlyInvoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);

      const pendingRevenue = monthlyInvoices
        .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = monthlyInvoices
        .filter((inv) => {
          const invDate = new Date(inv.created_at);
          return (
            inv.status === 'paid' &&
            invDate.getMonth() === currentMonth &&
            invDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0);

      setStats({
        totalClinics,
        activeClinics,
        trialClinics,
        suspendedClinics,
        totalRevenue,
        pendingRevenue,
        monthlyRevenue,
        totalPatients,
        totalTreatments,
        totalInvoices: monthlyInvoices.length
      });

      const { data: recentClinicsData } = await supabase
        .from('clinics')
        .select('id, name, subscription_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentClinics(recentClinicsData || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading overview...</div>
      </div>
    );
  }

  const panels = [
    {
      title: 'Platform volume',
      Icon: Activity,
      rows: [
        { label: 'Total patients', value: stats.totalPatients.toLocaleString() },
        { label: 'Total treatments', value: stats.totalTreatments.toLocaleString() },
        { label: 'Total invoices', value: stats.totalInvoices.toLocaleString() },
      ],
    },
    {
      title: 'Clinic status',
      Icon: Building2,
      rows: [
        { label: 'Active', value: stats.activeClinics.toLocaleString() },
        { label: 'Trial', value: stats.trialClinics.toLocaleString() },
        { label: 'Suspended', value: stats.suspendedClinics.toLocaleString() },
      ],
    },
    {
      title: 'Revenue health',
      Icon: TrendingUp,
      rows: [
        {
          label: 'Collection rate',
          value: `${
            stats.totalRevenue > 0
              ? ((stats.totalRevenue / (stats.totalRevenue + stats.pendingRevenue)) * 100).toFixed(1)
              : 0
          }%`,
        },
        {
          label: 'Avg per clinic',
          value: `${currencySymbol} ${
            stats.activeClinics > 0
              ? (stats.totalRevenue / stats.activeClinics).toLocaleString(undefined, { maximumFractionDigits: 0 })
              : 0
          }`,
        },
        {
          label: 'This month share',
          value: `${
            stats.totalRevenue > 0 ? ((stats.monthlyRevenue / stats.totalRevenue) * 100).toFixed(1) : 0
          }%`,
        },
      ],
    },
  ];

  return (
    <div className="w-full space-y-6">
      <header className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground">
        <p className="eyebrow text-primary-foreground/60">Control center</p>
        <h1 className="font-display mt-1 text-2xl font-semibold sm:text-3xl">Platform overview</h1>
        <p className="mt-1 max-w-xl text-sm text-primary-foreground/70">
          Live health of every clinic on the platform. Use the sidebar to manage clinics, billing and settings.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total clinics', value: stats.totalClinics.toLocaleString(), sub: `${stats.activeClinics} active · ${stats.trialClinics} trial`, Icon: Building2 },
          { label: 'Total revenue', value: `${currencySymbol} ${stats.totalRevenue.toLocaleString()}`, sub: 'Paid invoices', Icon: DollarSign },
          { label: 'Pending revenue', value: `${currencySymbol} ${stats.pendingRevenue.toLocaleString()}`, sub: 'Outstanding', Icon: AlertCircle },
          { label: 'This month', value: `${currencySymbol} ${stats.monthlyRevenue.toLocaleString()}`, sub: 'Collected revenue', Icon: Calendar },
        ].map(({ label, value, sub, Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow text-muted-foreground">{label}</p>
                <p className="font-display mt-2 truncate text-2xl font-semibold text-foreground">{value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
              </div>
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {panels.map(({ title, Icon, rows }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-semibold text-foreground">{title}</h2>
              <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </div>
            <dl className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
                  <dt className="truncate text-sm text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-semibold text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-sm font-semibold text-foreground">Recently added clinics</h2>
          <button
            onClick={() => onNavigate?.('clinics')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="divide-y divide-border">
          {recentClinics.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">No clinics yet.</p>
          )}
          {recentClinics.map((clinic) => (
            <div key={clinic.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{clinic.name}</p>
                <p className="text-xs text-muted-foreground">
                  Added {new Date(clinic.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize text-foreground/75">
                {clinic.subscription_status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

