// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Settings, Image, Mail, Share2, Info, Palette, FileText, Save, Upload, X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_type: string;
  category: string;
  description: string;
}

interface AppImage {
  id: string;
  image_type: string;
  image_url: string;
  image_name: string;
  alt_text: string;
  is_active: boolean;
}

type SettingCategory = 'branding' | 'homepage' | 'contact' | 'footer' | 'social' | 'email' | 'features' | 'hero' | 'subscription';

export default function WebAppSettingsModule() {
  const [activeTab, setActiveTab] = useState<SettingCategory>('branding');
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [images, setImages] = useState<AppImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSettings, setEditedSettings] = useState<Record<string, any>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    loadImages();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleImageUpload = async (imageType: string, file: File) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const { data: existing } = await supabase
          .from('app_images')
          .select('id')
          .eq('image_type', imageType)
          .eq('is_active', true)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('app_images')
            .update({
              image_url: base64String,
              image_name: file.name,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('app_images')
            .insert({
              image_type: imageType,
              image_url: base64String,
              image_name: file.name,
              alt_text: imageType,
              is_active: true
            });
        }

        loadImages();
        alert('Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedSettings).map(([key, value]) => {
        const setting = settings.find(s => s.setting_key === key);
        if (!setting) return null;

        return supabase
          .from('app_settings')
          .update({
            setting_value: JSON.stringify(value),
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key);
      }).filter(Boolean);

      await Promise.all(updates);

      setEditedSettings({});
      await loadSettings();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getSettingValue = (key: string, defaultValue: any = '') => {
    if (editedSettings[key] !== undefined) {
      return editedSettings[key];
    }
    const setting = settings.find(s => s.setting_key === key);
    if (!setting) return defaultValue;
    try {
      return JSON.parse(setting.setting_value);
    } catch {
      return setting.setting_value;
    }
  };

  const filteredSettings = settings.filter(s => s.category === activeTab);

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'hero', label: 'Hero Section', icon: FileText },
    { id: 'features', label: 'Features', icon: Info },
    { id: 'contact', label: 'Contact Info', icon: Mail },
    { id: 'social', label: 'Social Media', icon: Share2 },
    { id: 'footer', label: 'Footer', icon: FileText },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'subscription', label: 'Subscription Messages', icon: AlertTriangle },
  ];

  const renderImageUpload = (imageType: string, label: string) => {
    const currentImage = images.find(img => img.image_type === imageType && img.is_active);

    return (
      <div className="mb-4 sm:mb-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {currentImage && (
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 border-2 border-gray-300 rounded-lg overflow-hidden">
              <img
                src={currentImage.image_url}
                alt={currentImage.alt_text}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="w-full sm:w-auto">
            <label className="cursor-pointer inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm w-full sm:w-auto">
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              <span className="hidden sm:inline">Upload {label}</span>
              <span className="sm:hidden">Upload</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(imageType, file);
                }}
              />
            </label>
            {currentImage && (
              <p className="text-xs sm:text-sm text-gray-500 mt-2 truncate max-w-[200px]">{currentImage.image_name}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingInput = (setting: AppSetting) => {
    const value = getSettingValue(setting.setting_key, '');
    const key = setting.setting_key;

    if (setting.setting_type === 'color') {
      return (
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={value}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            className="w-20 h-10 rounded cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="#000000"
          />
        </div>
      );
    }

    if (setting.setting_type === 'boolean') {
      return (
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => handleSettingChange(key, e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Enabled</span>
        </label>
      );
    }

    if (key.includes('description') || key.includes('signature')) {
      return (
        <textarea
          value={value}
          onChange={(e) => handleSettingChange(key, e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleSettingChange(key, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Web App Settings</h2>
            <p className="text-sm sm:text-base text-gray-600">Customize your application appearance and content</p>
          </div>
        </div>
        {Object.keys(editedSettings).length > 0 && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-4 sm:space-x-8 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingCategory)}
                className={`flex items-center gap-1 sm:gap-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        {activeTab === 'branding' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <div>
                {renderImageUpload('logo', 'Logo')}
                {renderImageUpload('icon', 'App Icon')}
                {renderImageUpload('favicon', 'Favicon')}
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Brand Settings</h3>
              <div className="space-y-3 sm:space-y-4">
                {filteredSettings.map(setting => (
                  <div key={setting.id}>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {setting.description}
                    </label>
                    {renderSettingInput(setting)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'branding' && (
          <div className="space-y-3 sm:space-y-4">
            {filteredSettings.length === 0 ? (
              <p className="text-sm sm:text-base text-gray-500 text-center py-6 sm:py-8">No settings found for this category</p>
            ) : (
              filteredSettings.map(setting => (
                <div key={setting.id}>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {setting.description}
                  </label>
                  {renderSettingInput(setting)}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-blue-900">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Changes will be visible on the homepage immediately after saving</li>
              <li>Images are stored as base64 data for portability</li>
              <li>For best results, use PNG or JPG images under 1MB</li>
              <li>Recommended logo size: 200x60px, Icon/Favicon: 512x512px</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
