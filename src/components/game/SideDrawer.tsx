import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SidePanelConfig {
  title: string;
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  content: React.ReactNode;
}

/** Abas + corpo rolável. Usado tanto no trilho lateral (desktop) quanto na gaveta (mobile). */
export const SidePanel: React.FC<SidePanelConfig & { onClose?: () => void }> = ({
  title,
  tabs,
  activeTab,
  onTabChange,
  content,
  onClose,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-14 px-4 flex items-center justify-between border-b border-line shrink-0">
        <h2 className="font-display font-bold text-base text-ink">{title}</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="icon-btn border-transparent" aria-label={t('game.close')}>
            <X size={20} />
          </button>
        )}
      </div>

      {tabs.length > 1 && (
        <div role="tablist" className="flex border-b border-line shrink-0 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-h-11 px-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-accent text-ink bg-accent-soft'
                    : 'border-transparent text-muted hover:text-body'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">{content}</div>
    </div>
  );
};

interface SideDrawerProps extends SidePanelConfig {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/** Gaveta fora da tela para telas menores que xl. */
export const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, onClose, className = '', ...panel }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 flex justify-end ${className}`}>
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={panel.title}
            className="relative w-full max-w-sm sm:max-w-md h-full bg-surface border-l border-line shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <SidePanel {...panel} onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
