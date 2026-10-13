import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tabs?: TabOption[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  title,
  tabs,
  activeTab,
  onTabChange,
  children,
}) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-sm sm:max-w-md h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col z-10 transition-transform duration-300">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <h3 className="font-bold text-base text-white tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Optional Tabs */}
        {tabs && tabs.length > 1 && (
          <div className="flex border-b border-white/10 bg-black/20 shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                    isActive
                      ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
