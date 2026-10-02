// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { Check, Search, LayoutGrid, Scan, X, MousePointerClick } from 'lucide-react';
import { DentalChart } from './DentalChart';

interface ToothSelectorProps {
  onSelect?: (toothNumber: number) => void;
  selectedTooth?: number | null;
  selectedTeeth?: number[];
  onChange?: (teeth: number[]) => void;
}

interface ToothInfo {
  number: number;
  palmerNotation: string;
  name: string;
  position: string;
  type: 'incisor' | 'canine' | 'premolar' | 'molar';
}

const TOOTH_IMAGES: Record<number, string> = {
  11: '/teeth/central.png', 12: '/teeth/lateral.png', 13: '/teeth/canine.png',
  14: '/teeth/first premolar.png', 15: '/teeth/first premolar.png',
  16: '/teeth/1st molar.png', 17: '/teeth/1st molar.png', 18: '/teeth/1st molar.png',
  21: '/teeth/central.png', 22: '/teeth/lateral.png', 23: '/teeth/canine.png',
  24: '/teeth/first premolar.png', 25: '/teeth/first premolar.png',
  26: '/teeth/1st molar.png', 27: '/teeth/1st molar.png', 28: '/teeth/1st molar.png',
  31: '/teeth/central.png', 32: '/teeth/lateral.png', 33: '/teeth/canine.png',
  34: '/teeth/first premolar.png', 35: '/teeth/first premolar.png',
  36: '/teeth/1st molar.png', 37: '/teeth/1st molar.png', 38: '/teeth/1st molar.png',
  41: '/teeth/central.png', 42: '/teeth/lateral.png', 43: '/teeth/canine.png',
  44: '/teeth/first premolar.png', 45: '/teeth/first premolar.png',
  46: '/teeth/1st molar.png', 47: '/teeth/1st molar.png', 48: '/teeth/1st molar.png',
};

const ALL_TEETH: ToothInfo[] = [
  { number: 18, palmerNotation: '└8', name: '3rd Molar (Wisdom)', position: 'Upper Left', type: 'molar' },
  { number: 17, palmerNotation: '└7', name: '2nd Molar', position: 'Upper Left', type: 'molar' },
  { number: 16, palmerNotation: '└6', name: '1st Molar', position: 'Upper Left', type: 'molar' },
  { number: 15, palmerNotation: '└5', name: '2nd Premolar', position: 'Upper Left', type: 'premolar' },
  { number: 14, palmerNotation: '└4', name: '1st Premolar', position: 'Upper Left', type: 'premolar' },
  { number: 13, palmerNotation: '└3', name: 'Canine', position: 'Upper Left', type: 'canine' },
  { number: 12, palmerNotation: '└2', name: 'Lateral Incisor', position: 'Upper Left', type: 'incisor' },
  { number: 11, palmerNotation: '└1', name: 'Central Incisor', position: 'Upper Left', type: 'incisor' },
  { number: 21, palmerNotation: '1┘', name: 'Central Incisor', position: 'Upper Right', type: 'incisor' },
  { number: 22, palmerNotation: '2┘', name: 'Lateral Incisor', position: 'Upper Right', type: 'incisor' },
  { number: 23, palmerNotation: '3┘', name: 'Canine', position: 'Upper Right', type: 'canine' },
  { number: 24, palmerNotation: '4┘', name: '1st Premolar', position: 'Upper Right', type: 'premolar' },
  { number: 25, palmerNotation: '5┘', name: '2nd Premolar', position: 'Upper Right', type: 'premolar' },
  { number: 26, palmerNotation: '6┘', name: '1st Molar', position: 'Upper Right', type: 'molar' },
  { number: 27, palmerNotation: '7┘', name: '2nd Molar', position: 'Upper Right', type: 'molar' },
  { number: 28, palmerNotation: '8┘', name: '3rd Molar (Wisdom)', position: 'Upper Right', type: 'molar' },
  { number: 48, palmerNotation: '┌8', name: '3rd Molar (Wisdom)', position: 'Lower Left', type: 'molar' },
  { number: 47, palmerNotation: '┌7', name: '2nd Molar', position: 'Lower Left', type: 'molar' },
  { number: 46, palmerNotation: '┌6', name: '1st Molar', position: 'Lower Left', type: 'molar' },
  { number: 45, palmerNotation: '┌5', name: '2nd Premolar', position: 'Lower Left', type: 'premolar' },
  { number: 44, palmerNotation: '┌4', name: '1st Premolar', position: 'Lower Left', type: 'premolar' },
  { number: 43, palmerNotation: '┌3', name: 'Canine', position: 'Lower Left', type: 'canine' },
  { number: 42, palmerNotation: '┌2', name: 'Lateral Incisor', position: 'Lower Left', type: 'incisor' },
  { number: 41, palmerNotation: '┌1', name: 'Central Incisor', position: 'Lower Left', type: 'incisor' },
  { number: 31, palmerNotation: '1┐', name: 'Central Incisor', position: 'Lower Right', type: 'incisor' },
  { number: 32, palmerNotation: '2┐', name: 'Lateral Incisor', position: 'Lower Right', type: 'incisor' },
  { number: 33, palmerNotation: '3┐', name: 'Canine', position: 'Lower Right', type: 'canine' },
  { number: 34, palmerNotation: '4┐', name: '1st Premolar', position: 'Lower Right', type: 'premolar' },
  { number: 35, palmerNotation: '5┐', name: '2nd Premolar', position: 'Lower Right', type: 'premolar' },
  { number: 36, palmerNotation: '6┐', name: '1st Molar', position: 'Lower Right', type: 'molar' },
  { number: 37, palmerNotation: '7┐', name: '2nd Molar', position: 'Lower Right', type: 'molar' },
  { number: 38, palmerNotation: '8┐', name: '3rd Molar (Wisdom)', position: 'Lower Right', type: 'molar' },
];

function quadrantOf(tooth: ToothInfo): 'UR' | 'UL' | 'LR' | 'LL' {
  // Layout is shown as the patient faces you: their left is screen right.
  switch (tooth.position) {
    case 'Upper Left': return 'UR';
    case 'Upper Right': return 'UL';
    case 'Lower Left': return 'LR';
    default: return 'LL';
  }
}

function transformFor(quadrant: 'UR' | 'UL' | 'LR' | 'LL'): string {
  if (quadrant === 'UR') return 'scaleX(-1)';
  if (quadrant === 'LR') return 'scaleY(-1)';
  if (quadrant === 'LL') return 'scaleX(-1) scaleY(-1)';
  return '';
}

const ToothShape = ({ tooth, isSelected, quadrant }: { tooth: ToothInfo; isSelected: boolean; quadrant: 'UR' | 'UL' | 'LR' | 'LL' }) => (
  <div
    className="relative w-full h-full transition-all duration-200"
    style={{
      filter: isSelected
        ? 'drop-shadow(0 6px 14px rgba(2, 132, 199, 0.45)) brightness(1.08) saturate(1.15)'
        : 'drop-shadow(0 1px 2px rgba(15, 23, 42, 0.12))',
    }}
  >
    <img
      src={TOOTH_IMAGES[tooth.number] || '/teeth/central.png'}
      alt={tooth.name}
      draggable={false}
      className="w-full h-full object-contain select-none"
      style={{ transform: transformFor(quadrant) }}
    />
  </div>
);

export function ToothSelector({ onSelect, selectedTooth, selectedTeeth = [], onChange }: ToothSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('diagram');

  const isMultiSelect = !!onChange;

  const handleToothClick = (toothNumber: number) => {
    if (isMultiSelect && onChange) {
      const next = [...selectedTeeth];
      const idx = next.indexOf(toothNumber);
      if (idx > -1) next.splice(idx, 1);
      else next.push(toothNumber);
      onChange(next);
    } else if (onSelect) {
      onSelect(toothNumber);
    }
  };

  const isToothSelected = (n: number) => (isMultiSelect ? selectedTeeth.includes(n) : selectedTooth === n);

  const selectedCount = isMultiSelect ? selectedTeeth.length : selectedTooth ? 1 : 0;

  const matches = (tooth: ToothInfo) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tooth.number.toString().includes(q) ||
      tooth.palmerNotation.includes(q) ||
      tooth.name.toLowerCase().includes(q) ||
      tooth.position.toLowerCase().includes(q)
    );
  };

  const filteredTeeth = useMemo(() => ALL_TEETH.filter(matches), [searchQuery]);
  const upperTeeth = filteredTeeth.filter(t => t.position.startsWith('Upper'));
  const lowerTeeth = filteredTeeth.filter(t => t.position.startsWith('Lower'));

  const clearSelection = () => {
    if (isMultiSelect && onChange) onChange([]);
    else if (onSelect) onSelect(null as any);
  };

  const ToothButton = ({ tooth }: { tooth: ToothInfo }) => {
    const isSelected = isToothSelected(tooth.number);
    const dimmed = !!searchQuery.trim() && !matches(tooth);
    const quadrant = quadrantOf(tooth);

    return (
      <button
        type="button"
        onClick={() => handleToothClick(tooth.number)}
        disabled={dimmed}
        title={`${tooth.name} · FDI ${tooth.number} · Palmer ${tooth.palmerNotation}`}
        className={`group relative flex flex-col items-center rounded-xl px-0.5 pt-1 pb-0.5 transition-all duration-150 touch-manipulation ${
          dimmed
            ? 'opacity-20 cursor-not-allowed'
            : isSelected
            ? 'bg-sky-50 ring-2 ring-sky-500 shadow-sm scale-[1.06] z-10'
            : 'hover:bg-slate-100 active:scale-95'
        }`}
      >
        {isSelected && (
          <span className="absolute -top-1 -right-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-white shadow">
            <Check className="h-2.5 w-2.5" strokeWidth={4} />
          </span>
        )}
        <div className="relative w-full h-24 sm:h-28 md:h-32">
          <ToothShape tooth={tooth} isSelected={isSelected} quadrant={quadrant} />
        </div>
        <span
          className={`mt-0.5 rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs font-bold tabular-nums transition-colors ${
            isSelected ? 'bg-sky-600 text-white' : 'text-slate-500 group-hover:text-sky-700'
          }`}
        >
          {tooth.number}
        </span>
      </button>
    );
  };

  const renderDiagramView = () => {
    const selectedForChart = isMultiSelect ? selectedTeeth : selectedTooth ? [selectedTooth] : [];

    return (
      <div className="space-y-3">
        <DentalChart
          selectedTeeth={selectedForChart}
          onToggleTooth={handleToothClick}
          showLegend={false}
          chartedBadge={selectedCount > 0 ? `${selectedCount} selected` : null}
        />

        {/* Selection summary */}
        {selectedCount > 0 ? (
          <div className="rounded-2xl bg-slate-900 p-4 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="text-sm sm:text-base font-bold">
                  {isMultiSelect
                    ? `${selectedTeeth.length} ${selectedTeeth.length === 1 ? 'tooth' : 'teeth'} selected`
                    : `Tooth #${selectedTooth} selected`}
                </span>
              </div>
              <button
                type="button"
                onClick={clearSelection}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20 transition"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(isMultiSelect ? [...selectedTeeth].sort((a, b) => a - b) : [selectedTooth!]).map(n => {
                const tooth = ALL_TEETH.find(t => t.number === n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleToothClick(n)}
                    title="Tap to remove"
                    className="group/chip flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold hover:bg-rose-500/80 transition"
                  >
                    <span className="text-sky-300 font-bold">#{n}</span>
                    <span className="text-slate-200">{tooth?.name}</span>
                    <X className="h-3 w-3 text-slate-400 group-hover/chip:text-white" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs sm:text-sm text-slate-500">
            <MousePointerClick className="h-4 w-4 text-slate-400" />
            {isMultiSelect ? 'Tap teeth on the chart to select — tap again to remove' : 'Tap a tooth on the chart to select it'}
          </div>
        )}
      </div>
    );
  };

  const renderToothCard = (tooth: ToothInfo) => {
    const isSelected = isToothSelected(tooth.number);
    return (
      <button
        type="button"
        key={tooth.number}
        onClick={() => handleToothClick(tooth.number)}
        className={`relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 touch-manipulation ${
          isSelected
            ? 'border-sky-500 bg-sky-50 shadow-sm ring-1 ring-sky-500'
            : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50 active:scale-[0.99]'
        }`}
      >
        <div
          className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg border font-bold ${
            isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          <span className="text-lg leading-none">{tooth.palmerNotation}</span>
          <span className={`mt-0.5 text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>#{tooth.number}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-bold ${isSelected ? 'text-sky-900' : 'text-slate-900'}`}>{tooth.name}</div>
          <div className={`text-xs ${isSelected ? 'text-sky-600' : 'text-slate-500'}`}>{tooth.position} · FDI {tooth.number}</div>
        </div>
        {isSelected && (
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Dental Chart</h3>
            <p className="text-[11px] sm:text-xs text-slate-400">FDI notation · tap to {isMultiSelect ? 'multi-select' : 'select'}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="rounded-full bg-sky-500/20 px-2.5 py-1 text-xs font-bold text-sky-300">
                {selectedCount}
              </span>
            )}
            <div className="flex rounded-lg bg-white/10 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('diagram')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'diagram' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Scan className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Chart</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by number, name or position…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/10 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[70vh] overflow-y-auto p-3 sm:p-4">
        {viewMode === 'diagram' ? (
          renderDiagramView()
        ) : (
          <div className="space-y-6">
            {upperTeeth.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 -mx-1 bg-white/95 px-1 py-2 backdrop-blur-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Upper Jaw <span className="text-slate-400">({upperTeeth.length})</span>
                  </h4>
                </div>
                <div className="space-y-2">{upperTeeth.map(renderToothCard)}</div>
              </div>
            )}
            {lowerTeeth.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 -mx-1 bg-white/95 px-1 py-2 backdrop-blur-sm">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Lower Jaw <span className="text-slate-400">({lowerTeeth.length})</span>
                  </h4>
                </div>
                <div className="space-y-2">{lowerTeeth.map(renderToothCard)}</div>
              </div>
            )}
            {filteredTeeth.length === 0 && (
              <div className="py-10 text-center text-slate-500">
                <Search className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm font-semibold">No teeth found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
