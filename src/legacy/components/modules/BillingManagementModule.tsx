// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { formatNumber } from '../../utils/numberFormatter';
import { printInvoice } from '../../utils/invoicePdfGenerator';
import {
  FileText,
  TrendingUp,
  RefreshCw,
  Check,
  Clock,
  Search,
  Building2,
  Printer,
  AlertCircle,
  Trash2,
  Calculator,
  Zap,
  ChevronRight,
  Send,
  Wallet,
  X,
} from 'lucide-react';

const CURRENCY = 'IQD';

const MODE_LABEL: Record<string, string> = {
  per_month: 'Per month',
  per_treatment: 'Per treatment',
  per_patient: 'Per patient',
};

const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Timezone-safe month bounds (toISOString would shift the day in UTC+ zones)
const monthBounds = (d: Date) => ({
  start: toLocalISO(new Date(d.getFullYear(), d.getMonth(), 1)),
  end: toLocalISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
});


const statusChip = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    invoiced: 'bg-sky-100 text-sky-800 border-sky-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    sent: 'bg-sky-100 text-sky-800 border-sky-200',
    paid: 'bg-lime-100 text-lime-900 border-lime-200',
    overdue: 'bg-rose-100 text-rose-800 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${map[status] || map.draft}`}>
      {status}
    </span>
  );
};

export default function BillingManagementModule() {
  const [tab, setTab] = useState<'run' | 'invoices'>('run');
  const [period, setPeriod] = useState(monthBounds(new Date()));
  const [usage, setUsage] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [discount, setDiscount] = useState(0);
  const [dueDays, setDueDays] = useState(30);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.start, period.end]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usageRes, invRes, subRes] = await Promise.all([
        supabase
          .from('monthly_clinic_usage')
          .select('*, clinics!inner(name)')
          .gte('billing_period_start', period.start)
          .lte('billing_period_end', period.end)
          .order('total_amount', { ascending: false }),
        supabase
          .from('clinic_monthly_invoices')
          .select('*, clinics!inner(name)')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('clinic_subscriptions')
          .select('clinic_id, billing_mode, subscription_plans(name, billing_mode)')
          .eq('status', 'active'),
      ]);
      if (usageRes.error) throw usageRes.error;
      if (invRes.error) throw invRes.error;
      const subMap: Record<string, any> = {};
      (subRes.data || []).forEach((s: any) => {
        subMap[s.clinic_id] = {
          mode: s.billing_mode || s.subscription_plans?.billing_mode,
          plan: s.subscription_plans?.name,
        };
      });
      setUsage(
        (usageRes.data || []).map((u: any) => ({
          ...u,
          clinic_name: u.clinics?.name,
          billing_type: subMap[u.clinic_id]?.mode,
          plan_name: subMap[u.clinic_id]?.plan,
        })),
      );
      setInvoices((invRes.data || []).map((i: any) => ({ ...i, clinic_name: i.clinics?.name })));

    } catch (err: any) {
      setError(err.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const runBilling = async () => {
    setBusy('run');
    try {
      const { data, error: rpcError } = await supabase.rpc('calculate_clinic_monthly_usage', {
        p_start_date: period.start,
        p_end_date: period.end,
      });
      if (rpcError) throw rpcError;
      if (!data?.length) {
        flash('No clinics with an active subscription plan for this period.');
        return;
      }

      // Remove pending records for this period so a re-run always reflects current rates
      await supabase
        .from('monthly_clinic_usage')
        .delete()
        .gte('billing_period_start', period.start)
        .lte('billing_period_end', period.end)
        .eq('status', 'pending');

      let saved = 0;
      for (const row of data) {
        const { error: saveError } = await supabase.rpc('save_monthly_usage_record', {
          p_clinic_id: row.clinic_id,
          p_billing_period_start: period.start,
          p_billing_period_end: period.end,
          p_treatment_count: row.treatment_count,
          p_patient_count: row.patient_count,
          p_billable_unit_count: row.billable_units,
          p_unit_price: row.unit_price,
          p_total_amount: row.total_amount,
          p_status: 'pending',
        });
        if (!saveError) saved++;
      }
      flash(`Billing run complete — ${saved} clinic${saved === 1 ? '' : 's'} calculated.`);
      await loadAll();
    } catch (err: any) {
      flash('Billing run failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  };

  const invoiceOne = async (record: any) => {
    setBusy(record.id);
    try {
      const { error: rpcError } = await supabase.rpc('create_clinic_monthly_invoice_with_items', {
        p_clinic_id: record.clinic_id,
        p_usage_record_id: record.id,
        p_discount_percentage: discount,
        p_issue_date: toLocalISO(new Date()),
        p_due_days: dueDays,
      });
      if (rpcError) throw rpcError;
      await loadAll();
      flash(`Invoice created for ${record.clinic_name}.`);
    } catch (err: any) {
      flash('Could not create invoice: ' + err.message);
    } finally {
      setBusy(null);
    }
  };

  const invoiceAllPending = async () => {
    const pending = usage.filter((u) => u.status === 'pending' && Number(u.total_amount) > 0);
    if (!pending.length) return flash('Nothing pending to invoice.');
    setBusy('bulk');
    let ok = 0;
    for (const rec of pending) {
      const { error: rpcError } = await supabase.rpc('create_clinic_monthly_invoice_with_items', {
        p_clinic_id: rec.clinic_id,
        p_usage_record_id: rec.id,
        p_discount_percentage: discount,
        p_issue_date: toLocalISO(new Date()),
        p_due_days: dueDays,
      });
      if (!rpcError) ok++;
    }
    setBusy(null);
    await loadAll();
    flash(`${ok} invoice${ok === 1 ? '' : 's'} generated.`);
  };

  const deleteUsage = async (record: any) => {
    setConfirmTarget(null);
    setBusy(record.id);
    try {
      if (record.status !== 'pending') {
        const { data: ids } = await supabase
          .from('clinic_monthly_invoices')
          .select('id')
          .eq('usage_record_id', record.id);
        if (ids?.length) {
          const list = ids.map((i: any) => i.id);
          await supabase.from('clinic_invoice_items').delete().in('invoice_id', list);
          await supabase.from('clinic_monthly_invoices').delete().in('id', list);
        }
      }
      const { error: delError } = await supabase.from('monthly_clinic_usage').delete().eq('id', record.id);
      if (delError) throw delError;
      await loadAll();
      flash('Record removed — you can re-run billing.');
    } catch (err: any) {
      flash('Delete failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  };

  const setInvoiceStatus = async (invoice: any, status: string) => {
    setBusy(invoice.id);
    try {
      const { error: rpcError } = await supabase.rpc('set_clinic_invoice_status', {
        p_invoice_id: invoice.id,
        p_status: status,
      });
      if (rpcError) throw rpcError;
      await loadAll();
      flash(`${invoice.invoice_number} marked ${status}.`);
    } catch (err: any) {
      flash('Update failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  };

  const printOne = async (invoice: any) => {
    try {
      const [{ data: items }, { data: clinic }] = await Promise.all([
        supabase.from('clinic_invoice_items').select('*').eq('invoice_id', invoice.id),
        supabase.from('clinics').select('email, phone, address').eq('id', invoice.clinic_id).maybeSingle(),
      ]);
      printInvoice({
        ...invoice,
        clinic_email: clinic?.email,
        clinic_phone: clinic?.phone,
        clinic_address: clinic?.address,
        items: items || [],
      });
    } catch (err: any) {
      flash('Print failed: ' + err.message);
    }
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = period.start.split('-').map(Number);
    setPeriod(monthBounds(new Date(y, m - 1 + delta, 1)));
  };

  const periodLabel = (() => {
    const [y, m] = period.start.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  })();


  const kpis = useMemo(() => {
    const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const outstanding = invoices
      .filter((i) => ['draft', 'sent', 'overdue'].includes(i.status))
      .reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const periodValue = usage.reduce((s, u) => s + Number(u.total_amount || 0), 0);
    const pendingCount = usage.filter((u) => u.status === 'pending').length;
    return { paid, outstanding, periodValue, pendingCount };
  }, [invoices, usage]);

  const filteredInvoices = invoices.filter((i) => {
    const q = search.toLowerCase();
    const matches = !q || i.clinic_name?.toLowerCase().includes(q) || i.invoice_number?.toLowerCase().includes(q);
    return matches && (statusFilter === 'all' || i.status === statusFilter);
  });

  const filteredUsage = usage.filter((u) => !search || u.clinic_name?.toLowerCase().includes(search.toLowerCase()));

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <h3 className="font-semibold text-rose-900">Billing system unavailable</h3>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <button onClick={loadAll} className="mt-3 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-300">Platform billing</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Billing console</h1>
            <p className="mt-1 max-w-md text-sm text-slate-300">
              Run a billing cycle from the subscription plans you assigned, then invoice every clinic in one pass.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-2xl bg-white/10 p-1 backdrop-blur">
              <button onClick={() => shiftMonth(-1)} className="rounded-xl px-3 py-2 text-sm hover:bg-white/10">‹</button>
              <span className="px-3 text-sm font-semibold">{periodLabel}</span>
              <button onClick={() => shiftMonth(1)} className="rounded-xl px-3 py-2 text-sm hover:bg-white/10">›</button>
            </div>
            <button
              onClick={runBilling}
              disabled={busy === 'run'}
              className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-lime-300 disabled:opacity-60"
            >
              {busy === 'run' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Run billing
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'This period', value: `${formatNumber(kpis.periodValue)} ${CURRENCY}`, icon: Calculator },
            { label: 'Collected', value: `${formatNumber(kpis.paid)} ${CURRENCY}`, icon: TrendingUp },
            { label: 'Outstanding', value: `${formatNumber(kpis.outstanding)} ${CURRENCY}`, icon: Clock },
            { label: 'Awaiting invoice', value: `${kpis.pendingCount}`, icon: FileText },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-300">
                <k.icon className="h-3.5 w-3.5" />
                {k.label}
              </div>
              <p className="mt-1 truncate text-lg font-bold sm:text-xl">{k.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Controls */}
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex rounded-2xl bg-slate-100 p-1">
          {[
            { id: 'run', label: 'Billing run', count: usage.length },
            { id: 'invoices', label: 'Invoices', count: invoices.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === t.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
              }`}
            >
              {t.label}
              <span className="ml-2 rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clinic or invoice…"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>

        {tab === 'invoices' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"
          >
            {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s === 'all' ? 'All status' : s}</option>
            ))}
          </select>
        )}
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      ) : tab === 'run' ? (
        <section className="space-y-4">
          {/* Invoice settings + bulk action */}
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Discount %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment terms (days)
                <input
                  type="number"
                  min={1}
                  value={dueDays}
                  onChange={(e) => setDueDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
                />
              </label>
            </div>
            <button
              onClick={invoiceAllPending}
              disabled={busy === 'bulk' || !usage.some((u) => u.status === 'pending')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow disabled:opacity-40"
            >
              {busy === 'bulk' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Invoice all pending
            </button>
          </div>

          {filteredUsage.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Calculator className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-800">No billing data for {periodLabel}</h3>
              <p className="mt-1 text-sm text-slate-500">Hit “Run billing” to calculate every subscribed clinic.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredUsage.map((u) => {
                const mode = u.billing_type || u.billing_mode;
                return (
                  <article key={u.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{u.clinic_name}</p>
                          <p className="text-xs text-slate-500">
                            {u.plan_name ? `${u.plan_name} · ` : ''}
                            {MODE_LABEL[mode] || 'Subscription'} · {formatNumber(u.unit_price)} {CURRENCY}

                          </p>
                        </div>
                      </div>
                      {statusChip(u.status)}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-slate-50 p-2">
                        <p className="text-[11px] uppercase text-slate-500">Treatments</p>
                        <p className="font-bold text-slate-900">{u.treatment_count}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-2">
                        <p className="text-[11px] uppercase text-slate-500">Patients</p>
                        <p className="font-bold text-slate-900">{u.patient_count}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-2">
                        <p className="text-[11px] uppercase text-slate-500">Billable</p>
                        <p className="font-bold text-slate-900">{u.billable_unit_count}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Amount due</p>
                        <p className="text-xl font-extrabold text-slate-900">
                          {formatNumber(u.total_amount)} <span className="text-sm font-semibold text-slate-500">{CURRENCY}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.status === 'pending' && (
                          <button
                            onClick={() => invoiceOne(u)}
                            disabled={busy === u.id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"
                          >
                            {busy === u.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                            Invoice
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmTarget(u)}
                          className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 text-rose-600 hover:bg-rose-50"
                          title="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-800">No invoices yet</h3>
              <p className="mt-1 text-sm text-slate-500">Run a billing cycle and invoice pending clinics.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => (
              <article key={inv.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-slate-900">{inv.clinic_name}</p>
                      {statusChip(inv.status)}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {inv.invoice_number} · {new Date(inv.billing_period_start).toLocaleDateString()} –{' '}
                      {new Date(inv.billing_period_end).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {MODE_LABEL[inv.billing_type] || inv.billing_type} · {inv.unit_count} × {formatNumber(inv.unit_price)}{' '}
                      {CURRENCY}
                      {Number(inv.discount_percentage) > 0 && ` · −${inv.discount_percentage}%`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-slate-900">
                      {formatNumber(inv.total_amount)} <span className="text-sm font-semibold text-slate-500">{inv.currency || CURRENCY}</span>
                    </p>
                    <p className="text-xs text-slate-500">Due {new Date(inv.due_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => printOne(inv)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  {inv.status === 'draft' && (
                    <button
                      onClick={() => setInvoiceStatus(inv, 'sent')}
                      disabled={busy === inv.id}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Mark sent
                    </button>
                  )}
                  {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                    <button
                      onClick={() => setInvoiceStatus(inv, 'paid')}
                      disabled={busy === inv.id}
                      className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
                    >
                      <Wallet className="h-4 w-4" /> Mark paid
                    </button>
                  )}
                  {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                    <button
                      onClick={() => setInvoiceStatus(inv, 'cancelled')}
                      disabled={busy === inv.id}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {/* Delete confirm */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Delete billing record?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {confirmTarget.clinic_name} · {formatNumber(confirmTarget.total_amount)} {CURRENCY}
              {confirmTarget.status !== 'pending' && ' — its generated invoice will also be removed.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmTarget(null)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Keep
              </button>
              <button onClick={() => deleteUsage(confirmTarget)} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl sm:bottom-6">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-lime-300" /> {toast}
          </span>
        </div>
      )}
    </div>
  );
}
