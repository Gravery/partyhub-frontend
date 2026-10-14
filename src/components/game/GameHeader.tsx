import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Copy, Check, BookOpen, Users, History, Volume2, VolumeX, Menu } from 'lucide-react';
import { LanguageSelector } from '../LanguageSelector';

interface GameHeaderProps {
  gameTitle: string;
  roomCode: string;
  onExit?: () => void;
  /** Linha de status: de quem é a vez e o que fazer agora. */
  status?: React.ReactNode;
  /** Indicadores curtos do jogo (nível, placar, fichas). */
  stats?: React.ReactNode;
  onToggleRules?: () => void;
  onTogglePlayers?: () => void;
  onToggleLog?: () => void;
  playerCount?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  /** Com o trilho lateral visível (≥1280px) os atalhos de painel somem. */
  railVisible?: boolean;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameTitle,
  roomCode,
  onExit,
  status,
  stats,
  onToggleRules,
  onTogglePlayers,
  onToggleLog,
  playerCount,
  soundEnabled,
  onToggleSound,
  railVisible = false,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const panelBtn = railVisible ? 'xl:hidden' : '';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Área de transferência indisponível: o código continua visível no chip
    }
  };

  return (
    <div className="border-b border-line bg-ground">
      <div className="h-15 md:h-17 px-2 sm:px-4 xl:px-6 flex items-center gap-2 sm:gap-3">
        {/* Esquerda: sair, título e código da sala */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onExit && (
            <button type="button" onClick={onExit} className="icon-btn" aria-label={t('game.exit_room')}>
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="font-display font-bold text-lg md:text-xl text-accent truncate">{gameTitle}</h1>
          <button
            type="button"
            onClick={handleCopyCode}
            className="hidden min-[400px]:inline-flex items-center gap-2 h-9 px-3 rounded-[10px] border border-line-strong bg-surface hover:bg-raised font-mono font-bold text-sm tracking-[0.14em] text-ink transition-colors cursor-pointer shrink-0"
            aria-label={t('game.copy_room_code', { code: roomCode })}
          >
            {roomCode}
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-muted" />}
          </button>
        </div>

        {/* Centro: status e indicadores (abaixo de 768px vão para a segunda linha) */}
        <div className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-2">
          {status}
          {stats}
        </div>
        <div className="flex-1 md:hidden" />

        {/* Direita: som, painéis, idioma */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className="icon-btn"
              aria-label={soundEnabled ? t('game.sound_off') : t('game.sound_on')}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          )}
          {onToggleRules && (
            <button type="button" onClick={onToggleRules} className={`icon-btn hidden sm:inline-flex ${panelBtn}`} aria-label={t('game.rules')}>
              <BookOpen size={20} />
            </button>
          )}
          {onToggleLog && (
            <button type="button" onClick={onToggleLog} className={`icon-btn hidden sm:inline-flex ${panelBtn}`} aria-label={t('game.history')}>
              <History size={20} />
            </button>
          )}
          {onTogglePlayers && (
            <>
              <button
                type="button"
                onClick={onTogglePlayers}
                className={`btn btn-secondary btn-sm hidden sm:inline-flex ${panelBtn}`}
                aria-label={t('game.players')}
              >
                <Users size={18} />
                {playerCount !== undefined && <span>{playerCount}</span>}
              </button>
              <button type="button" onClick={onTogglePlayers} className="icon-btn sm:hidden" aria-label={t('game.room_menu')}>
                <Menu size={20} />
              </button>
            </>
          )}
          <div className="hidden lg:block">
            <LanguageSelector />
          </div>
        </div>
      </div>

      {(status || stats) && (
        <div className="md:hidden px-2 sm:px-4 pb-2 flex items-center gap-2 min-w-0 [&>*:not([role=status])]:shrink-0">
          {status}
          {stats}
        </div>
      )}
    </div>
  );
};
