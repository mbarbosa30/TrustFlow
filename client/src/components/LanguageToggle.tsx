import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      className="relative"
    >
      <Languages className="h-5 w-5" />
      <span className="absolute bottom-0 right-0 text-[10px] font-bold">
        {language.toUpperCase()}
      </span>
      <span className="sr-only">{t('common.toggleLanguage')}</span>
    </Button>
  );
}
