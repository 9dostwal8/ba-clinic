// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AppSettings {
  [key: string]: any;
}

interface AppImage {
  id: string;
  image_type: string;
  image_url: string;
  image_name: string;
  alt_text: string;
  is_active: boolean;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({});
  const [images, setImages] = useState<AppImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadImages();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsObj: AppSettings = {};
      data?.forEach((setting) => {
        try {
          settingsObj[setting.setting_key] = JSON.parse(setting.setting_value);
        } catch {
          settingsObj[setting.setting_key] = setting.setting_value;
        }
      });

      setSettings(settingsObj);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from('app_images')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const getSetting = (key: string, defaultValue: any = '') => {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  };

  const getImage = (imageType: string) => {
    return images.find(img => img.image_type === imageType);
  };

  return {
    settings,
    images,
    loading,
    getSetting,
    getImage,
    reload: () => {
      loadSettings();
      loadImages();
    }
  };
}
