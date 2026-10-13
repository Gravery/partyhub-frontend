import React from 'react';

interface GameShellProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  themeClass?: string;
  overlay?: React.ReactNode;
}

/**
 * GameShell enforces a strict 100dvh zero-vertical-scroll layout.
 * Header stays pinned at top, footer stays pinned at bottom, and main stage
 * flexes/scales within the remaining viewport height.
 */
export const GameShell: React.FC<GameShellProps> = ({
  header,
  children,
  footer,
  className = '',
  themeClass = 'bg-slate-950 text-white',
  overlay,
}) => {
  return (
    <div
      className={`game-viewport w-full h-[100dvh] max-h-[100dvh] select-none ${themeClass} ${className}`}
    >
      {/* Pinned Header */}
      {header && <header className="shrink-0 z-30">{header}</header>}

      {/* Main Game Stage - Strictly flex-1, overflows hidden or managed per game */}
      <main className="flex-1 min-h-0 relative flex flex-col items-center justify-center overflow-hidden p-2 md:p-3">
        {children}
      </main>

      {/* Pinned Footer (Dock / Hand / Controls) */}
      {footer && <footer className="shrink-0 z-20">{footer}</footer>}

      {/* Overlays / Modals */}
      {overlay}
    </div>
  );
};
