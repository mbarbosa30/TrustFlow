import { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.overview': 'Overview',
    'nav.wallet': 'My Wallet',
    'nav.credit': 'Credit',
    'nav.support': 'Support',
    'nav.communities': 'Communities',
    'nav.howItWorks': 'How It Works',
    'nav.useCases': 'Use Cases',
    'nav.faqs': 'FAQs',
    'footer.terms': 'Terms & Privacy',
    'common.connectWallet': 'Connect Wallet',
    'common.disconnect': 'Disconnect',
    'common.loading': 'Loading...',
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    'landing.title': 'TrustFlow',
    'landing.subtitle': 'Sybil-Resistant Trust Network',
    'communities.title': 'Communities',
    'communities.create': 'Create Community',
    'communities.viewDashboard': 'View Lending Dashboard',
  },
  es: {
    'nav.overview': 'Resumen',
    'nav.wallet': 'Mi Billetera',
    'nav.credit': 'Crédito',
    'nav.support': 'Apoyo',
    'nav.communities': 'Comunidades',
    'nav.howItWorks': 'Cómo Funciona',
    'nav.useCases': 'Casos de Uso',
    'nav.faqs': 'Preguntas Frecuentes',
    'footer.terms': 'Términos y Privacidad',
    'common.connectWallet': 'Conectar Billetera',
    'common.disconnect': 'Desconectar',
    'common.loading': 'Cargando...',
    'common.submit': 'Enviar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.close': 'Cerrar',
    'landing.title': 'TrustFlow',
    'landing.subtitle': 'Red de Confianza Resistente a Sybil',
    'communities.title': 'Comunidades',
    'communities.create': 'Crear Comunidad',
    'communities.viewDashboard': 'Ver Panel de Préstamos',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
