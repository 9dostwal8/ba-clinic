// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';
import { formatNumber } from '../../utils/numberFormatter';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  DollarSign,
  Percent,
  FileText,
  AlertTriangle,
  BarChart3,
  Stethoscope,
  CreditCard,
  ArrowUpRight,
  PieChart,
  Users,
} from 'lucide-react';

interface Props {
  onNavigate?: (page: string) => void;
}

type Range = 'month' | 'quarter' | 'year';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function ClinicAdminDashboard({ onNavigate }: Props) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const ar = language === 'ar';

  const [range, setRange] = useState<Range>('month');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  const { start, end, trendStart } = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;
    if (range === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (range === 'quarter') start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    else start = new Date(now.getFullYear(), 0, 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return { start, end, trendStart };
  }, [range]);

  useEffect(() => {
    if (profile?.clinic_id) load();
  }, [profile?.clinic_id, range]);

  const load = async () => {
    setLoading(true);
    try {
      const clinicId = profile.clinic_id;
      const from = (trendStart < start ? trendStart : start).toISOString();

      const [invRes, payRes, expRes, salRes, visitRes, docRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, invoice_date, total, paid_amount, payment_status, doctor_id, patient_id, patients(full_name)')
          .eq('clinic_id', clinicId)
          .gte('invoice_date', from),
        supabase
          .from('payment_transactions')
          .select('id, amount, payment_method, collected_at')
          .eq('clinic_id', clinicId)
          .gte('collected_at', from),
        supabase
          .from('expenses')
          .select('id, amount, category, expense_date')
          .eq('clinic_id', clinicId)
          .gte('expense_date', from.slice(0, 10)),
        supabase
          .from('staff_salaries')
          .select('id, net_salary, payment_status, month, staff_id')
          .eq('clinic_id', clinicId),
        supabase
          .from('treatment_visits')
          .select('id, visit_date, visit_cost, payment_received, doctor_id, status')
          .eq('clinic_id', clinicId)
          .gte('visit_date', from),
        supabase
          .from('users')
          .select('id, full_name, role')
          .eq('clinic_id', clinicId)
          .in('role', ['doctor', 'clinic_admin']),
      ]);

      setInvoices(invRes.data || []);
      setPayments(payRes.data || []);
      setExpenses(expRes.data || []);
      setSalaries(salRes.data || []);
      setVisits(visitRes.data || []);
      setDoctors(docRes.data || []);
    } catch (e) {
      console.error('finance dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  const inRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  const stats = useMemo(() => {
    const periodInvoices = invoices.filter((i) => inRange(i.invoice_date));
    const billed = periodInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const collected = payments
      .filter((p) => inRange(p.collected_at))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstanding = invoices.reduce(
      (s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.paid_amount || 0)),
      0
    );
    const periodExpenses = expenses
      .filter((e) => inRange(e.expense_date))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const pendingPayroll = salaries
      .filter((s2) => s2.payment_status !== 'paid')
      .reduce((s, x) => s + Number(x.net_salary || 0), 0);
    const treatments = visits.filter((v) => inRange(v.visit_date)).length;
    const net = collected - periodExpenses;
    const margin = collected > 0 ? (net / collected) * 100 : 0;
    const collectionRate = billed > 0 ? Math.min(100, (collected / billed) * 100) : 0;
    const avgInvoice = periodInvoices.length ? billed / periodInvoices.length : 0;
    return {
      billed,
      collected,
      outstanding,
      periodExpenses,
      pendingPayroll,
      treatments,
      net,
      margin,
      collectionRate,
      avgInvoice,
      invoiceCount: periodInvoices.length,
      unpaid: invoices.filter((i) => Number(i.total || 0) - Number(i.paid_amount || 0) > 0),
    };
  }, [invoices, payments, expenses, salaries, visits, start, end]);

  const trend = useMemo(() => {
    const buckets: Record<string, { label: string; revenue: number; expense: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[monthKey(d)] = {
        label: d.toLocaleDateString(ar ? 'ar' : 'en', { month: 'short' }),
        revenue: 0,
        expense: 0,
      };
    }
    payments.forEach((p) => {
      const k = monthKey(new Date(p.collected_at));
      if (buckets[k]) buckets[k].revenue += Number(p.amount || 0);
    });
    expenses.forEach((e) => {
      const k = monthKey(new Date(e.expense_date));
      if (buckets[k]) buckets[k].expense += Number(e.amount || 0);
    });
    return Object.values(buckets);
  }, [payments, expenses, ar]);

  const byMethod = useMemo(() => {
    const map: Record<string, number> = {};
    payments.filter((p) => inRange(p.collected_at)).forEach((p) => {
      const k = p.payment_method || 'cash';
      map[k] = (map[k] || 0) + Number(p.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [payments, start, end]);

  const byDoctor = useMemo(() => {
    const map: Record<string, { revenue: number; visits: number }> = {};
    visits.filter((v) => inRange(v.visit_date)).forEach((v) => {
      if (!v.doctor_id) return;
      if (!map[v.doctor_id]) map[v.doctor_id] = { revenue: 0, visits: 0 };
      map[v.doctor_id].revenue += Number(v.visit_cost || 0);
      map[v.doctor_id].visits += 1;
    });
    invoices.filter((i) => inRange(i.invoice_date) && i.doctor_id).forEach((i) => {
      if (!map[i.doctor_id]) map[i.doctor_id] = { revenue: 0, visits: 0 };
    });
    return Object.entries(map)
      .map(([id, v]) => ({
        id,
        name: doctors.find((d) => d.id === id)?.full_name || (ar ? 'طبيب' : 'Doctor'),
        ...v,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [visits, invoices, doctors, start, end, ar]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter((e) => inRange(e.expense_date)).forEach((e) => {
      const k = e.category || 'other';
      map[k] = (map[k] || 0) + Number(e.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [expenses, start, end]);

  const money = (v: number) => `${currencySymbol} ${formatNumber(v)}`;
  const maxTrend = Math.max(1, ...trend.map((t) => Math.max(t.revenue, t.expense)));

  const ranges: { key: Range; label: string }[] = [
    { key: 'month', label: ar ? 'هذا الشهر' : 'This month' },
    { key: 'quarter', label: ar ? '3 أشهر' : '3 months' },
    { key: 'year', label: ar ? 'السنة' : 'Year' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <header className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-primary-foreground/60">
              {ar ? 'المركز المالي للعيادة' : 'Clinic finance control center'}
            </p>
            <h1 className="font-display mt-1 truncate text-2xl font-semibold sm:text-3xl">
              {profile?.full_name}
            </h1>
            <p className="mt-1 text-xs text-primary-foreground/70">
              {ar
                ? 'الإيرادات، الفواتير، المصروفات ومستحقات الأطباء'
                : 'Revenue, invoices, expenses and doctor payouts'}
            </p>
          </div>
          <div className="flex rounded-xl bg-primary-foreground/10 p-1">
            {ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  range === r.key
                    ? 'bg-primary-foreground text-primary'
                    : 'text-primary-foreground/70 hover:text-primary-foreground'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Primary money KPIs */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: ar ? 'المحصل' : 'Collected',
            value: money(stats.collected),
            Icon: Wallet,
            sub: `${ar ? 'نسبة التحصيل' : 'Collection rate'} ${stats.collectionRate.toFixed(0)}%`,
          },
          {
            label: ar ? 'إجمالي الفواتير' : 'Billed',
            value: money(stats.billed),
            Icon: Receipt,
            sub: `${stats.invoiceCount} ${ar ? 'فاتورة' : 'invoices'}`,
          },
          {
            label: ar ? 'المصروفات' : 'Expenses',
            value: money(stats.periodExpenses),
            Icon: TrendingDown,
            sub: ar ? 'خلال الفترة' : 'This period',
          },
          {
            label: ar ? 'صافي الربح' : 'Net profit',
            value: money(stats.net),
            Icon: TrendingUp,
            sub: `${ar ? 'هامش' : 'Margin'} ${stats.margin.toFixed(0)}%`,
          },
        ].map(({ label, value, Icon, sub }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="eyebrow truncate text-muted-foreground">{label}</p>
                <p className="font-display mt-2 truncate text-xl font-semibold text-foreground sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>
              </div>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Secondary metrics */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: ar ? 'الذمم المدينة' : 'Outstanding A/R', value: money(stats.outstanding), Icon: AlertTriangle },
          { label: ar ? 'رواتب مستحقة' : 'Pending payroll', value: money(stats.pendingPayroll), Icon: Users },
          { label: ar ? 'متوسط الفاتورة' : 'Avg invoice', value: money(stats.avgInvoice), Icon: BarChart3 },
          { label: ar ? 'عدد العلاجات' : 'Treatments', value: formatNumber(stats.treatments), Icon: Stethoscope },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-background p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-bold text-foreground">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Trend + payment methods */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {ar ? 'الإيرادات مقابل المصروفات (6 أشهر)' : 'Revenue vs expenses (6 months)'}
            </h2>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex h-44 items-end gap-2">
            {trend.map((t) => (
              <div key={t.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t-md bg-primary transition-all"
                    style={{ height: `${Math.max(3, (t.revenue / maxTrend) * 100)}%` }}
                    title={money(t.revenue)}
                  />
                  <div
                    className="w-1/2 rounded-t-md bg-destructive/60 transition-all"
                    style={{ height: `${Math.max(3, (t.expense / maxTrend) * 100)}%` }}
                    title={money(t.expense)}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> {ar ? 'إيرادات' : 'Revenue'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-destructive/60" /> {ar ? 'مصروفات' : 'Expenses'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {ar ? 'طرق الدفع' : 'Payment methods'}
            </h2>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>
          {byMethod.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {ar ? 'لا توجد مدفوعات' : 'No payments yet'}
            </p>
          ) : (
            <div className="space-y-3">
              {byMethod.map(([method, amount]) => {
                const pct = stats.collected > 0 ? (amount / stats.collected) * 100 : 0;
                return (
                  <div key={method}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium capitalize text-foreground">{method}</span>
                      <span className="font-semibold text-foreground">{money(amount)}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">
                {ar ? 'المصروفات حسب البند' : 'Expenses by category'}
              </h3>
              <PieChart className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {expenseByCategory.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                {ar ? 'لا توجد مصروفات' : 'No expenses'}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {expenseByCategory.map(([cat, amount]) => (
                  <li key={cat} className="flex items-center justify-between text-xs">
                    <span className="truncate capitalize text-muted-foreground">{cat}</span>
                    <span className="font-semibold text-foreground">{money(amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Doctor performance + unpaid invoices */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {ar ? 'إنتاجية الأطباء ومستحقاتهم' : 'Doctor production & payouts'}
            </h2>
            <button
              onClick={() => onNavigate?.('commissions')}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {ar ? 'العمولات' : 'Commissions'} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-4 sm:p-5">
            {byDoctor.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {ar ? 'لا توجد بيانات' : 'No data for this period'}
              </p>
            ) : (
              <div className="space-y-2">
                {byDoctor.map((d) => {
                  const top = byDoctor[0].revenue || 1;
                  return (
                    <div key={d.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {d.visits} {ar ? 'زيارة' : 'visits'}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-foreground">
                          {money(d.revenue)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${(d.revenue / top) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-sm font-semibold text-foreground">
              {ar ? 'فواتير غير مسددة' : 'Outstanding invoices'}
            </h2>
            <button
              onClick={() => onNavigate?.('invoices')}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              {ar ? 'الكل' : 'View all'} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-4 sm:p-5">
            {stats.unpaid.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {ar ? 'كل الفواتير مسددة' : 'All invoices are settled'}
              </p>
            ) : (
              <div className="space-y-2">
                {stats.unpaid
                  .sort(
                    (a, b) =>
                      Number(b.total || 0) - Number(b.paid_amount || 0) -
                      (Number(a.total || 0) - Number(a.paid_amount || 0))
                  )
                  .slice(0, 6)
                  .map((inv) => {
                    const due = Number(inv.total || 0) - Number(inv.paid_amount || 0);
                    return (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {inv.patients?.full_name || inv.invoice_number}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {inv.invoice_number} ·{' '}
                            {new Date(inv.invoice_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-end">
                          <p className="text-sm font-bold text-destructive">{money(due)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {ar ? 'من' : 'of'} {money(Number(inv.total || 0))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Finance shortcuts */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5">
        <h2 className="eyebrow mb-3 text-muted-foreground">
          {ar ? 'التقارير والمحاسبة' : 'Accounting & reports'}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: ar ? 'المحاسبة' : 'Accounting', Icon: DollarSign, page: 'accounting' },
            { label: ar ? 'الفواتير' : 'Invoices', Icon: FileText, page: 'invoices' },
            { label: ar ? 'المدفوعات' : 'Payments', Icon: Wallet, page: 'receptionist-payments' },
            { label: ar ? 'العمولات' : 'Commissions', Icon: Percent, page: 'commissions' },
            { label: ar ? 'الرواتب' : 'Payroll', Icon: Users, page: 'staff' },
            { label: ar ? 'الاشتراك' : 'Subscription', Icon: Receipt, page: 'clinic-subscription' },
          ].map((item) => (
            <button
              key={item.page}
              onClick={() => onNavigate?.(item.page)}
              className="group flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-3 text-start transition hover:border-primary/25 hover:bg-primary/5"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition group-hover:bg-accent group-hover:text-accent-foreground">
                <item.Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
