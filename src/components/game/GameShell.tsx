import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SideDrawer, SidePanel, type SidePanelConfig } from './SideDrawer';

export type GameAccent = 'cyan' | 'zinc' | 'amber' | 'sky' | 'violet';

interface GameShellProps {
  accent: GameAccent;
  header: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  overlay?: React.ReactNode;
  /** Avisos flutuantes no topo do palco (erros, toasts). */
  notices?: React.ReactNode;
  /** Jogadores, regras e histórico. Trilho fixo a partir de 1280px, gaveta abaixo disso. */
  side?: SidePanelConfig;
  /** Mostra o trilho lateral no desktop (o lobby já lista os jogadores, então esconde). */
  showRail?: boolean;
  sideOpen?: boolean;
  onSideClose?: () => void;
  /** Muda quando a fase do jogo muda, para animar a transição. */
  phaseKey?: string;
}

/**
 * Layout em três zonas, sem rolagem vertical:
 * cabeçalho fixo, palco que ocupa o espaço restante e trilho lateral em telas largas.
 */
export const GameShell: React.FC<GameShellProps> = ({
  accent,
  header,
  children,
  footer,
  overlay,
  notices,
  side,
  showRail = true,
  sideOpen = false,
  onSideClose,
  phaseKey,
}) => {
  const hasRail = Boolean(side && showRail);

  return (
    <div className={`game-viewport accent-${accent} w-full bg-ground text-body select-none`}>
      <header className="shrink-0 z-30">{header}</header>

      <div className="flex-1 min-h-0 flex">
        <main className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
          {notices && (
            <div className="pointer-events-none absolute top-3 inset-x-0 z-40 flex flex-col items-center gap-2 px-3">
              {notices}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phaseKey ?? 'stage'}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex-1 min-h-0 w-full flex flex-col items-center justify-center p-3 md:p-4 xl:p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {hasRail && side && (
          <aside className="hidden xl:flex w-[340px] 2xl:w-[380px] shrink-0 flex-col min-h-0 border-l border-line bg-surface">
            <SidePanel {...side} />
          </aside>
        )}
      </div>

      {footer && <footer className="shrink-0 z-20">{footer}</footer>}

      {side && (
        <SideDrawer
          {...side}
          isOpen={sideOpen}
          onClose={() => onSideClose?.()}
          className={hasRail ? 'xl:hidden' : ''}
        />
      )}

      {overlay}
    </div>
  );
};
