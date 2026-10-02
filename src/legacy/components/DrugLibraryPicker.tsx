// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Search, X, Pill, Check, ShieldAlert, Info, Loader2, Plus, ChevronDown,
} from 'lucide-react';

export interface PickedDrug {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const FALLBACK: any[] = [
  { name: 'Amoxicillin', strength: '500mg', dosage_form: 'capsule', drug_class: 'Penicillin Antibiotic', default_dosage: '500mg', default_frequency: '3 times daily', default_duration: '7 days' },
  { name: 'Augmentin', strength: '625mg', dosage_form: 'tablet', drug_class: 'Penicillin Antibiotic', default_dosage: '625mg', default_frequency: '2 times daily', default_duration: '7 days' },
  { name: 'Metronidazole', strength: '400mg', dosage_form: 'tablet', drug_class: 'Antibiotic/Antiprotozoal', default_dosage: '400mg', default_frequency: '3 times daily', default_duration: '5 days' },
  { name: 'Azithromycin', strength: '500mg', dosage_form: 'tablet', drug_class: 'Macrolide Antibiotic', default_dosage: '500mg', default_frequency: 'Once daily', default_duration: '3 days' },
  { name: 'Ibuprofen', strength: '400mg', dosage_form: 'tablet', drug_class: 'NSAID (Non-Steroidal Anti-Inflammatory)', default_dosage: '400mg', default_frequency: '3 times daily', default_duration: '3-5 days' },
  { name: 'Paracetamol', strength: '500mg', dosage_form: 'tablet', drug_class: 'Analgesic/Antipyretic', default_dosage: '500mg', default_frequency: 'Every 6 hours', default_duration: '3 days' },
  { name: 'Chlorhexidine Mouthwash', strength: '0.2%', dosage_form: 'rinse', drug_class: 'Antiseptic Oral Rinse', default_dosage: '10ml', default_frequency: '2 times daily', default_duration: '7 days', instructions: 'Rinse 30 seconds, do not swallow' },
  { name: 'Fluoride Toothpaste', strength: '1450ppm', dosage_form: 'paste', drug_class: 'Fluoride Dental Care', default_dosage: 'Pea-sized amount', default_frequency: '2 times daily', default_duration: 'Ongoing' },
];

const GROUPS: { id: string; label: string; match: (c: string) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'antibiotic', label: 'Antibiotics', match: (c) => /antibiotic|penicillin|macrolide|antiprotozoal/.test(c) },
  { id: 'pain', label: 'Pain relief', match: (c) => /nsaid|analgesic|antipyretic/.test(c) },
  { id: 'rinse', label: 'Rinses', match: (c) => /rinse|antiseptic/.test(c) },
  { id: 'dental', label: 'Dental care', match: (c) => /dental|toothpaste|fluoride|desensitizing|cosmetic/.test(c) },
];

const FREQ_PRESETS = ['Once daily', '2 times daily', '3 times daily', '4 times daily', 'Every 6 hours', 'As needed'];
const DUR_PRESETS = ['3 days', '5 days', '7 days', '10 days', '14 days', 'Ongoing'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: PickedDrug[]) => void;
}

export function DrugLibraryPicker({ isOpen, onClose, onAdd }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [drugs, setDrugs] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [selected, setSelected] = useState<Record<string, PickedDrug>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelected({});
    setQuery('');
    setGroup('all');
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .eq('is_active', true)
          .or(`is_global.eq.true,clinic_id.eq.${profile?.clinic_id ?? '00000000-0000-0000-0000-000000000000'}`)
          .order('name');
        if (error) throw error;
        if (!cancelled) setDrugs(data?.length ? data : FALLBACK);
      } catch {
        if (!cancelled) setDrugs(FALLBACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, profile?.clinic_id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const g = GROUPS.find(x => x.id === group)!;
    return drugs.filter(d => {
      const cls = String(d.drug_class || '').toLowerCase();
      if (!g.match(cls)) return false;
      if (!q) return true;
      const hay = [d.name, d.name_ar, d.generic_name, d.drug_class, d.indication, (d.brand_names || []).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [drugs, query, group]);

  const keyOf = (d: any) => d.id || d.name;

  const toggle = (d: any) => {
    const k = keyOf(d);
    setSelected(prev => {
      const next = { ...prev };
      if (next[k]) { delete next[k]; return next; }
      next[k] = {
        drug_name: [d.name, d.strength].filter(Boolean).join(' '),
        dosage: d.default_dosage || d.strength || '',
        frequency: d.default_frequency || '',
        duration: d.default_duration || '',
        instructions: d.instructions || '',
      };
      return next;
    });
  };

  const patch = (k: string, field: keyof PickedDrug, value: string) =>
    setSelected(prev => (prev[k] ? { ...prev, [k]: { ...prev[k], [field]: value } } : prev));

  const count = Object.keys(selected).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:h-[90vh] sm:rounded-3xl">
        {/* Header */}
        <div className="bg-slate-900 px-4 pb-3 pt-4 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-400 text-slate-900">
                <Pill className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black sm:text-xl">Drug library</h2>
                <p className="truncate text-[11px] text-slate-300 sm:text-sm">
                  {loading ? 'Loading formulary…' : `${drugs.length} medications · tap to add`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
              aria-label="Close drug library"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drug, brand, class or indication…"
              className="w-full rounded-2xl border border-white/10 bg-white/10 py-2.5 pl-10 pr-9 text-sm text-white placeholder:text-slate-400 focus:border-lime-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            {GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  group === g.id ? 'bg-lime-400 text-slate-900' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-5">
          {loading ? (
            <div className="grid h-full place-items-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <div>
                <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm">
                  <Search className="h-6 w-6" />
                </span>
                <p className="font-bold text-slate-800">No match for “{query}”</p>
                <p className="mt-1 text-sm text-slate-500">Try the generic name, or add the drug manually.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {filtered.map(d => {
                const k = keyOf(d);
                const picked = selected[k];
                const isOpenRow = expanded === k;
                return (
                  <div
                    key={k}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                      picked ? 'border-lime-500 ring-2 ring-lime-200' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(d)}
                      className="flex w-full items-start gap-3 p-3.5 text-left active:bg-slate-50"
                    >
                      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
                        picked ? 'bg-lime-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {picked ? <Check className="h-5 w-5" strokeWidth={3} /> : <Pill className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-black text-slate-900">{d.name}</span>
                          {d.strength && (
                            <span className="shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {d.strength}
                            </span>
                          )}
                          {d.controlled_substance && (
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">
                          {d.generic_name || d.drug_class || d.dosage_form}
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {[d.default_dosage, d.default_frequency, d.default_duration].filter(Boolean).map((v: string, i: number) => (
                            <span key={i} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              {v}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>

                    {(d.indication || d.warnings || d.side_effects) && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpenRow ? null : k)}
                        className="flex w-full items-center justify-between border-t border-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-500"
                      >
                        <span className="inline-flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Clinical info</span>
                        <ChevronDown className={`h-4 w-4 transition ${isOpenRow ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {isOpenRow && (
                      <div className="space-y-1 border-t border-slate-100 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-600">
                        {d.indication && <p><span className="font-bold text-slate-800">Indication:</span> {d.indication}</p>}
                        {d.warnings && <p className="text-amber-700"><span className="font-bold">Warning:</span> {d.warnings}</p>}
                        {d.side_effects && <p><span className="font-bold text-slate-800">Side effects:</span> {d.side_effects}</p>}
                      </div>
                    )}

                    {picked && (
                      <div className="space-y-2 border-t border-lime-200 bg-lime-50/60 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={picked.dosage}
                            onChange={(e) => patch(k, 'dosage', e.target.value)}
                            placeholder="Dosage"
                            className="rounded-lg border border-lime-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-lime-500 focus:outline-none"
                          />
                          <input
                            value={picked.duration}
                            onChange={(e) => patch(k, 'duration', e.target.value)}
                            placeholder="Duration"
                            className="rounded-lg border border-lime-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-lime-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                          {FREQ_PRESETS.map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => patch(k, 'frequency', f)}
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                                picked.frequency === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                          {DUR_PRESETS.map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => patch(k, 'duration', f)}
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                                picked.duration === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900">
                {count === 0 ? 'No medication selected' : `${count} medication${count > 1 ? 's' : ''} selected`}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {count === 0 ? 'Tap any card to add it to the prescription' : Object.values(selected).map(s => s.drug_name).join(', ')}
              </p>
            </div>
            <button
              type="button"
              disabled={count === 0}
              onClick={() => { onAdd(Object.values(selected)); onClose(); }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Add{count > 0 ? ` ${count}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DrugLibraryPicker;
