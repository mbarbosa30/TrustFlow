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
    'common.toggleLanguage': 'Toggle language',
    'landing.title': 'TrustFlow',
    'landing.subtitle': 'Sybil-Resistant Trust Network',
    'communities.title': 'Communities',
    'communities.description': 'Discover and join trust networks with custom endorsement criteria',
    'communities.create': 'Create Community',
    'communities.viewDashboard': 'View Lending Dashboard',
    'communities.myCommunities': 'My Communities',
    'communities.allCommunities': 'All Communities',
    'communities.viewDetails': 'View Details',
    'communities.dashboard': 'Dashboard',
    'communities.noCommunities': 'No communities yet',
    'communities.beFirst': 'Be the first to create a trust network',
    'communities.prompt': 'Prompt',
    'communities.community': 'Community',
    'communities.public': 'Public',
    'communities.private': 'Private',
    'overview.title': 'Overview',
    'overview.description': 'Your personal trust hub: view your score, give endorsements, and manage your network',
  },
  es: {
    'nav.overview': 'Resumen',
    'nav.wallet': 'Mi Billetera',
    'nav.credit': 'Crédito',
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
    'common.toggleLanguage': 'Cambiar idioma',
    'landing.title': 'TrustFlow',
    'landing.subtitle': 'Red de Confianza Resistente a Sybil',
    'communities.title': 'Comunidades',
    'communities.description': 'Descubre y únete a redes de confianza con criterios de respaldo personalizados',
    'communities.create': 'Crear Comunidad',
    'communities.viewDashboard': 'Ver Panel de Préstamos',
    'communities.myCommunities': 'Mis Comunidades',
    'communities.allCommunities': 'Todas las Comunidades',
    'communities.viewDetails': 'Ver Detalles',
    'communities.dashboard': 'Panel',
    'communities.noCommunities': 'Aún no hay comunidades',
    'communities.beFirst': 'Sé el primero en crear una red de confianza',
    'communities.prompt': 'Pregunta',
    'communities.community': 'Comunidad',
    'communities.public': 'Pública',
    'communities.private': 'Privada',
    'overview.title': 'Resumen',
    'overview.description': 'Tu centro de confianza personal: ve tu puntuación, da respaldos y administra tu red',
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
