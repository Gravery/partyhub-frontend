import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { i18n } = useTranslation();

  const currentLang = i18n.resolvedLanguage?.startsWith('pt') ? 'pt' : 'en';

  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'pt' : 'en';
    i18n.changeLanguage(nextLang);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleLanguage}
      className={`px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all text-gray-200 cursor-pointer shadow-md ${className}`}
      title={currentLang === 'en' ? 'Switch to Portuguese' : 'Mudar para Inglês'}
    >
      <span>{currentLang === 'en' ? '🇺🇸' : '🇧🇷'}</span>
      <span>{currentLang.toUpperCase()}</span>
      <span className="text-[10px] text-gray-400">⇄</span>
    </motion.button>
  );
}
