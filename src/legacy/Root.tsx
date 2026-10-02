// @ts-nocheck
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';

export default function LegacyRoot() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}
