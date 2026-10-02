// @ts-nocheck
import { useEffect } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';

export function DynamicHead() {
  const { getSetting, getImage } = useAppSettings();

  useEffect(() => {
    const appName = getSetting('app_name', 'ClinicFlow');
    document.title = appName;

    const faviconImage = getImage('favicon');
    const iconImage = getImage('icon');

    if (faviconImage || iconImage) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = (faviconImage || iconImage)!.image_url;
      } else {
        const newFavicon = document.createElement('link');
        newFavicon.rel = 'icon';
        newFavicon.href = (faviconImage || iconImage)!.image_url;
        document.head.appendChild(newFavicon);
      }
    }
  }, [getSetting, getImage]);

  return null;
}
