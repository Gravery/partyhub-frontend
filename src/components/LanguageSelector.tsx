import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { i18n, t } = useTranslation();

  const currentLang = i18n.resolvedLanguage?.startsWith('pt') ? 'pt' : 'en';

  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'en' ? 'pt' : 'en');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`btn btn-ghost btn-sm border-line-strong ${className}`}
      aria-label={t('common.switch_language')}
      title={t('common.switch_language')}
    >
      <Languages size={18} />
      <span className="font-mono">{currentLang.toUpperCase()}</span>
    </button>
  );
}
