// @ts-nocheck
import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';

interface Treatment {
  id: string;
  name: string;
  name_ar: string;
  cost: number;
}

interface TreatmentSelectorProps {
  treatments: Treatment[];
  onSelect: (treatment: Treatment) => void;
  toothNumber: number;
  language?: string;
}

export function TreatmentSelector({ treatments, onSelect, toothNumber, language = 'en' }: TreatmentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);

  const filteredTreatments = treatments.filter(treatment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      treatment.name.toLowerCase().includes(searchLower) ||
      (treatment.name_ar && treatment.name_ar.toLowerCase().includes(searchLower))
    );
  });

  const handleSelect = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setTimeout(() => {
      onSelect(treatment);
    }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" className="flex-shrink-0">
            <path d="M16 2 C10 2, 6 8, 6 14 C6 22, 8 28, 16 30 C24 28, 26 22, 26 14 C26 8, 22 2, 16 2 Z" />
          </svg>
          <div>
            <h3 className="text-2xl font-bold">Tooth #{toothNumber}</h3>
            <p className="text-sky-100 text-sm">Select treatment for this tooth</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search treatments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
        {filteredTreatments.map((treatment) => {
          const isSelected = selectedTreatment?.id === treatment.id;
          return (
            <button
              key={treatment.id}
              type="button"
              onClick={() => handleSelect(treatment)}
              className={`relative group text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                isSelected
                  ? 'border-green-500 bg-green-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-sky-400 hover:shadow-md hover:scale-102'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-base mb-1 transition-colors ${
                    isSelected ? 'text-green-700' : 'text-gray-900 group-hover:text-sky-600'
                  }`}>
                    {treatment.name}
                  </h4>
                  {treatment.name_ar && (
                    <p className="text-sm text-gray-600 mb-2" dir="rtl">
                      {treatment.name_ar}
                    </p>
                  )}
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                    isSelected
                      ? 'bg-green-600 text-white'
                      : 'bg-sky-100 text-sky-700 group-hover:bg-sky-200'
                  }`}>
                    <span className="text-xs">IQD</span>
                    <span>{treatment.cost.toLocaleString()}</span>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {!isSelected && (
                <div className="absolute inset-0 bg-sky-500 opacity-0 group-hover:opacity-5 rounded-xl transition-opacity pointer-events-none"></div>
              )}
            </button>
          );
        })}
      </div>

      {filteredTreatments.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No treatments found</p>
          <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
        </div>
      )}
    </div>
  );
}
