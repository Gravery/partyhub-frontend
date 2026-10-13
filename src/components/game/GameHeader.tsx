import React, { useState } from 'react';
import { Copy, Check, LogOut, BookOpen, Users, History, Volume2, VolumeX } from 'lucide-react';
import { LanguageSelector } from '../LanguageSelector';

interface GameHeaderProps {
  gameTitle: string;
  gameBadge?: string;
  roomCode: string;
  centerContent?: React.ReactNode;
  onExit?: () => void;
  onToggleRules?: () => void;
  onTogglePlayers?: () => void;
  onToggleLog?: () => void;
  playerCount?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  accentColor?: string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameTitle,
  gameBadge,
  roomCode,
  centerContent,
  onExit,
  onToggleRules,
  onTogglePlayers,
  onToggleLog,
  playerCount,
  soundEnabled,
  onToggleSound,
  accentColor = 'text-purple-400',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="h-12 md:h-14 px-2 md:px-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
      {/* Left: Exit + Title + Room Code Chip */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onExit && (
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Sair da sala"
          >
            <LogOut size={18} />
          </button>
        )}

        <div className="flex items-center gap-1.5 truncate">
          <span className={`font-bold text-sm md:text-base tracking-tight truncate ${accentColor}`}>
            {gameTitle}
          </span>
          {gameBadge && (
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
              {gameBadge}
            </span>
          )}
        </div>

        {/* Room Code Chip */}
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold tracking-wider text-gray-200 transition-all active:scale-95 cursor-pointer"
          title="Clique para copiar o código da sala"
        >
          <span className="text-gray-400 hidden sm:inline">SALA:</span>
          <span>{roomCode}</span>
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-gray-400" />}
        </button>
      </div>

      {/* Center: Dynamic Game Status / Turn / Score */}
      <div className="flex-1 flex justify-center px-2 min-w-0">
        {centerContent}
      </div>

      {/* Right: Drawer Triggers & Controls */}
      <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title={soundEnabled ? 'Silenciar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}

        {onToggleRules && (
          <button
            onClick={onToggleRules}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Regras do jogo"
          >
            <BookOpen size={16} />
          </button>
        )}

        {onToggleLog && (
          <button
            onClick={onToggleLog}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Histórico de ações"
          >
            <History size={16} />
          </button>
        )}

        {onTogglePlayers && (
          <button
            onClick={onTogglePlayers}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Ver jogadores"
          >
            <Users size={14} />
            {playerCount !== undefined && <span>{playerCount}</span>}
          </button>
        )}

        <div className="hidden sm:block">
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
};
