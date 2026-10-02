// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useCurrency() {
  const { profile } = useAuth();
  const [currencySymbol, setCurrencySymbol] = useState('IQD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrency();
  }, [profile?.clinic_id]);

  const loadCurrency = async () => {
    if (!profile?.clinic_id) {
      setLoading(false);
      return;
    }

    try {
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('currency_id, currencies(symbol)')
        .eq('id', profile.clinic_id)
        .single();

      if (clinicData?.currencies?.symbol) {
        setCurrencySymbol(clinicData.currencies.symbol);
      }
    } catch (error) {
      console.error('Error loading currency:', error);
    } finally {
      setLoading(false);
    }
  };

  return { currencySymbol, loading };
}
