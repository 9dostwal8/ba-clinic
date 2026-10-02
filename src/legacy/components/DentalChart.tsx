// @ts-nocheck
import React from 'react';
import { Check } from 'lucide-react';

export type ToothStatus =
  | 'healthy'
  | 'cavity'
  | 'filled'
  | 'crown'
  | 'root_canal'
  | 'missing'
  | 'implant'
  | 'previous_visit';

export interface LegendItem {
  status: ToothStatus;
  label: string;
}

export const DEFAULT_LEGEND: LegendItem[] = [
  { status: 'healthy', label: 'Healthy' },
  { status: 'cavity', label: 'Cavity' },
  { status: 'filled', label: 'Filled' },
  { status: 'crown', label: 'Crown' },
  { status: 'root_canal', label: 'Root Canal' },
  { status: 'missing', label: 'Missing' },
  { status: 'implant', label: 'Implant' },
  { status: 'previous_visit', label: 'Previous Visit' },
];

const STATUS_COLORS: Record<ToothStatus, { fill: string; hi: string; stroke: string; chip: string }> = {
  healthy: { fill: '#f8fafc', hi: '#e2e8f0', stroke: '#94a3b8', chip: '#10b981' },
  cavity: { fill: '#fee2e2', hi: '#fecaca', stroke: '#ef4444', chip: '#ef4444' },
  filled: { fill: '#dbeafe', hi: '#bfdbfe', stroke: '#3b82f6', chip: '#3b82f6' },
  crown: { fill: '#fef3c7', hi: '#fde68a', stroke: '#f59e0b', chip: '#f59e0b' },
  root_canal: { fill: '#f3e8ff', hi: '#e9d5ff', stroke: '#a855f7', chip: '#a855f7' },
  missing: { fill: '#f1f5f9', hi: '#e2e8f0', stroke: '#94a3b8', chip: '#64748b' },
  implant: { fill: '#cffafe', hi: '#a5f3fc', stroke: '#06b6d4', chip: '#06b6d4' },
  previous_visit: { fill: '#ffedd5', hi: '#fed7aa', stroke: '#f97316', chip: '#f97316' },
};

export function statusChipColor(status: ToothStatus): string {
  return STATUS_COLORS[status].chip;
}

type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar';

function typeOf(fdi: number): ToothType {
  const d = fdi % 10;
  if (d <= 2) return 'incisor';
  if (d === 3) return 'canine';
  if (d <= 5) return 'premolar';
  return 'molar';
}

const QUADRANTS = {
  topRight: [18, 17, 16, 15, 14, 13, 12, 11], // screen left — patient's right
  topLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  bottomRight: [48, 47, 46, 45, 44, 43, 42, 41],
  bottomLeft: [31, 32, 33, 34, 35, 36, 37, 38],
};

/**
 * Anatomical tooth artwork per type. viewBox 0 0 40 64, crown at top,
 * roots toward the bottom. Each shape is a single smooth path with
 * crown bulge, neck taper and natural root split.
 */
const SHAPES: Record<ToothType, { body: string; gloss?: string }> = {
  incisor: {
    // Single broad crown, single tapered root
    body:
      'M20 4 ' +
      'C12 4 7 9 7 15 ' +
      'C7 21 9 25 11 28 ' +
      'C13 31 14 33 14.5 38 ' +
      'C15 45 16 54 20 56 ' +
      'C24 54 25 45 25.5 38 ' +
      'C26 33 27 31 29 28 ' +
      'C31 25 33 21 33 15 ' +
      'C33 9 28 4 20 4 Z',
    gloss: 'M12 9 C10 12 10 17 11 21',
  },
  canine: {
    // Pointed crown tip, long single root
    body:
      'M20 3 ' +
      'C13 3 8 8 8 15 ' +
      'C8 21 10 25 12 28 ' +
      'C14 31 15 34 15.5 39 ' +
      'C16 46 17 56 20 59 ' +
      'C23 56 24 46 24.5 39 ' +
      'C25 34 26 31 28 28 ' +
      'C30 25 32 21 32 15 ' +
      'C32 8 27 3 20 3 Z',
    gloss: 'M12.5 9 C11 12 11 16 12 20',
  },
  premolar: {
    // Two-cusp crown, single round root
    body:
      'M20 6 ' +
      'C15 6 12.5 7 10.5 10 ' +
      'C8.5 13 8 17 9 21 ' +
      'C10 25 12 28 13.5 30 ' +
      'C15 32 15.5 35 16 40 ' +
      'C16.5 46 17.5 53 20 55 ' +
      'C22.5 53 23.5 46 24 40 ' +
      'C24.5 35 25 32 26.5 30 ' +
      'C28 28 30 25 31 21 ' +
      'C32 17 31.5 13 29.5 10 ' +
      'C27.5 7 25 6 20 6 Z',
    gloss: 'M12 11 C11 14 11 18 12 21',
  },
  molar: {
    // Broad crown with two cusps, twin roots flaring apart
    body:
      'M20 5 ' +
      'C13 5 9 8 8 14 ' +
      'C7 19 8 23 10 26 ' +
      'C12 29 12.5 31 12 36 ' +
      'C11.5 42 10 50 12.5 54 ' +
      'C14 56 15.5 53 15.8 47 ' +
      'C16 41 17 37 20 37 ' +
      'C23 37 24 41 24.2 47 ' +
      'C24.5 53 26 56 27.5 54 ' +
      'C30 50 28.5 42 28 36 ' +
      'C27.5 31 28 29 30 26 ' +
      'C32 23 33 19 32 14 ' +
      'C31 8 27 5 20 5 Z',
    gloss: 'M11.5 10 C10.5 13 10.5 17 11.5 20',
  },
};

function ToothSvg({
  fdi,
  status,
  flip,
  selected,
}: {
  fdi: number;
  status: ToothStatus;
  flip: boolean;
  selected: boolean;
}) {
  const type = typeOf(fdi);
  const shape = SHAPES[type];
  const colors = STATUS_COLORS[status];
  const isMissing = status === 'missing';
  const gid = `g-${status}`;

  return (
    <svg
      viewBox="0 0 40 64"
      className="h-full w-full"
      style={{
        transform: flip ? 'scaleY(-1)' : undefined,
        filter: selected
          ? 'drop-shadow(0 4px 8px rgba(2,132,199,0.45))'
          : 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.15))',
        opacity: isMissing ? 0.4 : 1,
        transition: 'filter 150ms ease',
      }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.fill} />
          <stop offset="100%" stopColor={colors.hi} />
        </linearGradient>
      </defs>
      <path
        d={shape.body}
        fill={`url(#${gid})`}
        stroke={selected ? '#0284c7' : colors.stroke}
        strokeWidth={selected ? 2.4 : 1.6}
        strokeLinejoin="round"
        strokeDasharray={isMissing ? '3.5 2.5' : undefined}
      />
      {shape.gloss && status === 'healthy' && (
        <path d={shape.gloss} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      )}
      {status === 'root_canal' && (
        <line x1="20" y1="10" x2="20" y2="52" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      )}
      {status === 'implant' && (
        <>
          <line x1="20" y1="30" x2="20" y2="54" stroke="#0891b2" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="16" y1="36" x2="24" y2="36" stroke="#0891b2" strokeWidth="2" />
          <line x1="16" y1="43" x2="24" y2="43" stroke="#0891b2" strokeWidth="2" />
          <line x1="17" y1="50" x2="23" y2="50" stroke="#0891b2" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

interface DentalChartProps {
  /** Per-tooth clinical status, keyed by FDI number. Defaults to healthy. */
  statuses?: Record<number, ToothStatus>;
  /** Currently selected teeth (FDI). */
  selectedTeeth?: number[];
  /** When provided, chart is interactive and toggles teeth on tap. */
  onToggleTooth?: (fdi: number) => void;
  showLegend?: boolean;
  legendItems?: LegendItem[];
  /** Badge text in the top-right, e.g. "4 teeth charted". */
  chartedBadge?: string | null;
}

export function DentalChart({
  statuses = {},
  selectedTeeth = [],
  onToggleTooth,
  showLegend = true,
  legendItems = DEFAULT_LEGEND,
  chartedBadge,
}: DentalChartProps) {
  const interactive = !!onToggleTooth;

  const Tooth = ({ fdi, flip }: { fdi: number; flip: boolean }) => {
    const status = statuses[fdi] || 'healthy';
    const selected = selectedTeeth.includes(fdi);
    const Tag: any = interactive ? 'button' : 'div';
    return (
      <Tag
        {...(interactive
          ? {
              type: 'button',
              onClick: () => onToggleTooth!(fdi),
              title: `FDI ${fdi} · ${status.replace('_', ' ')}`,
            }
          : { title: `FDI ${fdi} · ${status.replace('_', ' ')}` })}
        className={`group relative flex flex-col items-center rounded-lg px-0.5 pt-1 pb-0.5 transition-all duration-150 touch-manipulation select-none ${
          interactive
            ? selected
              ? 'bg-sky-50 ring-2 ring-sky-500 scale-[1.08] z-10'
              : 'hover:bg-slate-100 active:scale-95 cursor-pointer'
            : ''
        }`}
      >
        {selected && (
          <span className="absolute -top-1 -right-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-white shadow">
            <Check className="h-2.5 w-2.5" strokeWidth={4} />
          </span>
        )}
        <div className="relative h-14 w-9 sm:h-[4.5rem] sm:w-11">
          <ToothSvg fdi={fdi} status={status} flip={flip} selected={selected} />
        </div>
        <span
          className={`mt-0.5 rounded px-1 text-[10px] sm:text-[11px] font-bold tabular-nums ${
            selected ? 'bg-sky-600 text-white' : 'text-slate-500 group-hover:text-sky-700'
          }`}
        >
          {fdi}
        </span>
      </Tag>
    );
  };

  const QuadrantLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-1 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
      {children}
    </div>
  );

  const Midline = () => (
    <div className="pointer-events-none absolute inset-y-2 left-1/2 hidden w-px -translate-x-1/2 border-l border-dashed border-slate-200 lg:block" />
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 2 C10 2, 6 8, 6 14 C6 22, 8 28, 16 30 C24 28, 26 22, 26 14 C26 8, 22 2, 16 2 Z" />
            </svg>
          </span>
          <h3 className="text-sm font-bold text-slate-900">Dental Chart</h3>
        </div>
        {chartedBadge && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-slate-600">
            {chartedBadge}
          </span>
        )}
      </div>

      <div className="p-2.5 sm:p-5 space-y-3 sm:space-y-4">
        {/* Upper arch — quadrants stack on small screens so teeth stay tappable */}
        <div className="relative grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 min-[420px]:gap-2 sm:gap-6">
          <Midline />
          <div>
            <QuadrantLabel>Patient's Top Right</QuadrantLabel>
            <div className="grid grid-cols-8">
              {QUADRANTS.topRight.map((fdi) => (
                <Tooth key={fdi} fdi={fdi} flip={false} />
              ))}
            </div>
          </div>
          <div>
            <QuadrantLabel>Patient's Top Left</QuadrantLabel>
            <div className="grid grid-cols-8">
              {QUADRANTS.topLeft.map((fdi) => (
                <Tooth key={fdi} fdi={fdi} flip={false} />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-200" />

        {/* Lower arch */}
        <div className="relative grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 min-[420px]:gap-2 sm:gap-6">
          <Midline />
          <div>
            <QuadrantLabel>Patient's Bottom Right</QuadrantLabel>
            <div className="grid grid-cols-8">
              {QUADRANTS.bottomRight.map((fdi) => (
                <Tooth key={fdi} fdi={fdi} flip />
              ))}
            </div>
          </div>
          <div>
            <QuadrantLabel>Patient's Bottom Left</QuadrantLabel>
            <div className="grid grid-cols-8">
              {QUADRANTS.bottomLeft.map((fdi) => (
                <Tooth key={fdi} fdi={fdi} flip />
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
            {legendItems.map((item) => (
              <span key={item.status} className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-[4px]"
                  style={{ backgroundColor: STATUS_COLORS[item.status].chip }}
                />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
