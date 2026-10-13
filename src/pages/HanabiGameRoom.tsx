import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHanabiStore, type HanabiCard } from '../store/useHanabiStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FireworksCanvas } from '../components/FireworksCanvas';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { SideDrawer, type TabOption } from '../components/game/SideDrawer';
import { Users, BookOpen, History as HistoryIcon, Trash2, Flame, Sparkles } from 'lucide-react';

// Mapeamento de cores para classes Tailwind e efeitos visuais
export const COLOR_CONFIG: Record<
  string,
  { bg: string; border: string; text: string; glow: string; tag: string }
> = {
  red: {
    bg: 'bg-red-600',
    border: 'border-red-400',
    text: 'text-red-300',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    tag: 'VM',
  },
  yellow: {
    bg: 'bg-amber-400',
    border: 'border-amber-300',
    text: 'text-amber-300',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.5)]',
    tag: 'AM',
  },
  green: {
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    text: 'text-emerald-300',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    tag: 'VD',
  },
  blue: {
    bg: 'bg-blue-600',
    border: 'border-blue-400',
    text: 'text-blue-300',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    tag: 'AZ',
  },
  white: {
    bg: 'bg-slate-100 text-slate-950',
    border: 'border-slate-300',
    text: 'text-slate-100',
    glow: 'shadow-[0_0_20px_rgba(255,255,255,0.4)]',
    tag: 'BR',
  },
  multicolor: {
    bg: 'bg-gradient-to-br from-red-500 via-amber-400 via-emerald-500 via-blue-500 to-purple-600 text-white',
    border: 'border-white/80',
    text: 'text-fuchsia-300',
    glow: 'shadow-[0_0_25px_rgba(236,72,153,0.6)]',
    tag: 'MC',
  },
};

export const getColorName = (color: string, t: (k: string) => string) => {
  return t(`hanabi.colors.${color}`) || color;
};

export const getColorShort = (color: string, t: (k: string) => string) => {
  return t(`hanabi.colors_short.${color}`) || color.substring(0, 4).toUpperCase();
};

const GAME_MODES = [
  { id: 'classic', icon: '🎆' },
  { id: 'rainbow_full', icon: '🌈' },
  { id: 'rainbow_one', icon: '⚡' },
  { id: 'rainbow_wild', icon: '🃏' },
];

// Componente para renderizar a carta de um parceiro (face-up com cor e número visíveis)
function TeammateCard({ card, isHighlighted }: { card: HanabiCard; isHighlighted?: boolean }) {
  const { t } = useTranslation();
  const conf = COLOR_CONFIG[card.color] || COLOR_CONFIG.white;
  const isWhite = card.color === 'white';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative w-[clamp(54px,7vw,78px)] h-[clamp(82px,12.5dvh,118px)] aspect-[2/3] rounded-xl border-2 flex flex-col items-center justify-between p-1.5 shadow-lg select-none transition-all ${conf.bg} ${conf.border} ${conf.glow} ${
        isHighlighted ? 'ring-3 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.9)] scale-105' : ''
      }`}
    >
      {isHighlighted && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap animate-bounce z-20">
          {t('hanabi.clue_badge')}
        </div>
      )}

      <div className="w-full flex justify-between items-center text-[10px] md:text-xs font-black leading-none">
        <span className={isWhite ? 'text-slate-950' : 'text-white'}>{card.number}</span>
        <span
          className={`text-[8px] md:text-[9px] uppercase font-bold tracking-wider ${
            isWhite ? 'text-slate-700' : 'text-white/90'
          }`}
        >
          {getColorShort(card.color, t)}
        </span>
      </div>

      <div
        className={`text-2xl md:text-3xl font-black ${
          isWhite ? 'text-slate-950' : 'text-white'
        } drop-shadow-md leading-none my-auto`}
      >
        {card.number}
      </div>

      {/* Etiquetas do que o dono já sabe sobre a carta */}
      <div className="w-full flex flex-wrap gap-0.5 justify-center">
        {card.known_color && (
          <span className="px-1 py-0.2 bg-black/80 text-white rounded text-[8px] font-bold uppercase border border-white/20">
            {getColorShort(card.known_color, t)}
          </span>
        )}
        {card.known_number ? (
          <span className="px-1 py-0.2 bg-black/80 text-amber-300 rounded text-[8px] font-black border border-white/20">
            #{card.known_number}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}

// Componente para renderizar a SUA própria carta (face-down com etiquetas de dicas recebidas)
function MyCard({
  card,
  index,
  isMyTurn,
  canDiscard,
  isHighlighted,
  onPlay,
  onDiscard,
}: {
  card: HanabiCard;
  index: number;
  isMyTurn: boolean;
  canDiscard: boolean;
  isHighlighted?: boolean;
  onPlay: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const knownConf = card.known_color ? COLOR_CONFIG[card.known_color] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col items-center gap-1 group shrink-0"
    >
      <div
        className={`relative w-[clamp(70px,9vw,98px)] h-[clamp(105px,15dvh,148px)] aspect-[2/3] rounded-xl border-2 p-1.5 md:p-2 flex flex-col justify-between shadow-xl transition-all duration-300 select-none ${
          isHighlighted ? 'ring-3 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.9)] scale-105 animate-pulse' : ''
        } ${
          knownConf
            ? `bg-slate-950/95 ${knownConf.border} ${knownConf.glow}`
            : 'bg-slate-900/90 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
        }`}
      >
        {isHighlighted && (
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap z-20 animate-bounce">
            {t('hanabi.new_clue_badge')}
          </div>
        )}

        {/* Padrão visual do verso da carta */}
        <div className="absolute inset-0 bg-radial from-purple-900/20 via-transparent to-black/60 rounded-xl pointer-events-none" />

        <div className="flex justify-between items-center text-[10px] font-mono text-purple-300/60 z-10 leading-none">
          <span>#{index + 1}</span>
          <span>🎆</span>
        </div>

        {/* Informações que você sabe sobre a sua carta */}
        <div className="flex flex-col items-center justify-center gap-1 my-auto z-10">
          {card.known_number ? (
            <div className="text-2xl md:text-3xl font-black text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] leading-none">
              {card.known_number}
            </div>
          ) : (
            <div className="text-xl md:text-2xl text-gray-500 font-bold leading-none">?</div>
          )}

          <div className="flex flex-wrap gap-0.5 justify-center">
            {knownConf && card.known_color ? (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-wider ${knownConf.bg} ${
                  knownConf.text === 'text-slate-100' ? 'text-slate-950 font-black' : 'text-white'
                }`}
              >
                {getColorShort(card.known_color, t)}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-black/60 border border-white/10 rounded-full text-[8px] text-gray-400 font-mono">
                {t('hanabi.color_unknown')}
              </span>
            )}
          </div>
        </div>

        <div className="text-[8px] text-center text-gray-500 uppercase font-mono z-10 leading-none truncate w-full">
          {card.known_color || card.known_number ? t('hanabi.clue_recorded') : t('hanabi.no_clues')}
        </div>
      </div>

      {/* Botões de Ação no seu turno */}
      {isMyTurn && (
        <div className="flex gap-1 w-full max-w-[98px]">
          <button
            onClick={onPlay}
            className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white font-black text-[9px] uppercase tracking-wider rounded-lg shadow transition-all active:scale-95 cursor-pointer"
            title={t('hanabi.play_card_tooltip')}
          >
            {t('hanabi.play_card')}
          </button>
          <button
            onClick={onDiscard}
            disabled={!canDiscard}
            className="flex-1 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-600 text-gray-200 font-bold text-[9px] uppercase tracking-wider rounded-lg shadow transition-all active:scale-95 cursor-pointer"
            title={canDiscard ? t('hanabi.discard_card_tooltip') : t('hanabi.discard_card_disabled_tooltip')}
          >
            {t('hanabi.discard_card')}
          </button>
        </div>
      )}
    </motion.div>
  );
}

// Modal para dar dicas a um colega
function GiveClueModal({
  isOpen,
  onClose,
  targetPlayerName,
  targetCards,
  isWildMode,
  onConfirmClue,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetPlayerName: string;
  targetCards: HanabiCard[];
  isWildMode: boolean;
  onConfirmClue: (type: 'color' | 'number', value: string | number) => void;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<'color' | 'number'>('color');
  const [selectedValue, setSelectedValue] = useState<string | number>('');

  if (!isOpen) return null;

  const availableColors = Array.from(new Set(targetCards.map((c) => c.color))).filter(
    (col) => !(isWildMode && col === 'multicolor')
  );
  const availableNumbers = Array.from(new Set(targetCards.map((c) => c.number))).sort(
    (a, b) => a - b
  );

  const activeColor = selectedType === 'color' ? (selectedValue as string) || availableColors[0] : '';
  const activeNumber = selectedType === 'number' ? (selectedValue as number) || availableNumbers[0] : 0;

  const handleConfirm = () => {
    if (selectedType === 'color' && activeColor) {
      onConfirmClue('color', activeColor);
      onClose();
    } else if (selectedType === 'number' && activeNumber) {
      onConfirmClue('number', activeNumber);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl max-w-lg w-full p-4 md:p-6 shadow-[0_0_50px_rgba(168,85,247,0.3)] text-white max-h-[92vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-3 border-b border-purple-900/50 pb-2.5">
          <h3 className="text-lg md:text-xl font-black text-purple-200">
            {t('hanabi.give_clue_modal_title', { name: targetPlayerName })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer">
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-300 mb-3">
          {t('hanabi.give_clue_modal_desc')}
          {isWildMode && (
            <span className="block mt-1 text-fuchsia-300 font-medium">
              {t('hanabi.give_clue_modal_wild_desc')}
            </span>
          )}
        </p>

        {/* Prévia da mão do colega destacando as cartas correspondentes */}
        <div className="flex gap-2 justify-center mb-4 p-3 bg-black/50 rounded-xl border border-white/10 overflow-x-auto">
          {targetCards.map((card, i) => {
            const isMatch =
              (selectedType === 'color' &&
                (card.color === activeColor || (isWildMode && card.color === 'multicolor'))) ||
              (selectedType === 'number' && card.number === activeNumber);

            return (
              <div
                key={card.id || i}
                className={`relative transition-all duration-200 shrink-0 ${
                  isMatch ? 'scale-105 z-10 -translate-y-1' : 'opacity-40 grayscale-[0.4]'
                }`}
              >
                <TeammateCard card={card} />
                {isMatch && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-[8px] px-1.5 py-0.2 rounded-full shadow-lg whitespace-nowrap">
                    {t('hanabi.clue_badge')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Seleção do Tipo de Dica */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setSelectedType('color');
              setSelectedValue(availableColors[0] || '');
            }}
            className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              selectedType === 'color'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            {t('hanabi.clue_type_color')}
          </button>
          <button
            onClick={() => {
              setSelectedType('number');
              setSelectedValue(availableNumbers[0] || 0);
            }}
            className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              selectedType === 'number'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
                : 'bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            {t('hanabi.clue_type_number')}
          </button>
        </div>

        {/* Botões de Cores / Números Disponíveis */}
        {selectedType === 'color' ? (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {availableColors.map((col) => {
              const conf = COLOR_CONFIG[col] || COLOR_CONFIG.white;
              const isSelected = activeColor === col;
              return (
                <button
                  key={col}
                  onClick={() => setSelectedValue(col)}
                  className={`py-2 px-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-white scale-105 shadow-lg ring-2 ring-purple-400'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  } ${conf.bg} ${conf.text === 'text-slate-100' ? 'text-slate-950' : 'text-white'}`}
                >
                  {getColorShort(col, t)} ({getColorName(col, t)})
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-2 justify-center mb-4">
            {availableNumbers.map((num) => {
              const isSelected = activeNumber === num;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedValue(num)}
                  className={`w-11 h-11 rounded-xl font-black text-base flex items-center justify-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-white scale-110 shadow-lg ring-2 ring-amber-300'
                      : 'bg-black/60 text-amber-300 border-white/20 hover:border-amber-400'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
          >
            {t('hanabi.confirm_clue_btn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Modal de Pilha de Descarte
function DiscardModal({
  isOpen,
  onClose,
  discardPile,
  activeFireworksColors,
}: {
  isOpen: boolean;
  onClose: () => void;
  discardPile: HanabiCard[];
  activeFireworksColors: string[];
}) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const grouped: Record<string, number[]> = {};
  activeFireworksColors.forEach((col) => {
    grouped[col] = [];
  });

  discardPile.forEach((c) => {
    if (grouped[c.color]) {
      grouped[c.color].push(c.number);
    } else {
      grouped[c.color] = [c.number];
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-white/10 rounded-2xl max-w-xl w-full p-4 md:p-6 shadow-2xl text-white max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2.5">
          <h3 className="text-lg md:text-xl font-black text-purple-200">
            {t('hanabi.discarded_modal_title', { count: discardPile.length })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-lg cursor-pointer">
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          {t('hanabi.discarded_modal_desc')}
        </p>

        <div className="space-y-3 overflow-y-auto flex-grow pr-1">
          {Object.entries(grouped).map(([color, numbers]) => {
            const conf = COLOR_CONFIG[color] || COLOR_CONFIG.white;
            numbers.sort((a, b) => a - b);

            return (
              <div
                key={color}
                className="bg-black/40 p-2.5 rounded-xl border border-white/5 flex items-center gap-3"
              >
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase w-24 text-center shrink-0 ${
                    conf.bg
                  } ${conf.text === 'text-slate-100' ? 'text-slate-950 font-black' : 'text-white'}`}
                >
                  {getColorShort(color, t)} ({getColorName(color, t)})
                </span>

                <div className="flex gap-1.5 flex-wrap flex-grow">
                  {numbers.length === 0 ? (
                    <span className="text-xs text-gray-500 italic">{t('hanabi.none_discarded')}</span>
                  ) : (
                    numbers.map((num, i) => (
                      <span
                        key={i}
                        className="w-7 h-7 rounded-lg bg-black/60 border border-white/20 font-black flex items-center justify-center text-xs text-gray-200"
                      >
                        {num}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
        >
          {t('common.close')}
        </button>
      </motion.div>
    </div>
  );
}

export function HanabiGameRoom() {
  const { t } = useTranslation();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const {
    connect,
    disconnect,
    manualReconnect,
    isConnected,
    isReconnecting,
    reconnectAttempt,
    gameState,
    errorMsg,
    clearError,
    lastPlayResult,
    setGameOptions,
    toggleReady,
    startGame,
    giveClue,
    discardCard,
    playCard,
    restartGame,
    disconnectNotice,
  } = useHanabiStore();

  const [clueModalTarget, setClueModalTarget] = useState<string | null>(null);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'players' | 'rules' | 'log' | 'discard' | null>(null);

  // Efeitos Pirotécnicos & Feedback
  const [burstTrigger, setBurstTrigger] = useState<{
    color: string;
    isBonus?: boolean;
    timestamp: number;
  } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [playToast, setPlayToast] = useState<{
    type: 'success' | 'error';
    message: string;
    submessage?: string;
  } | null>(null);

  // Observa resultados de jogadas para disparar animações e partículas
  useEffect(() => {
    if (!lastPlayResult) return;

    if (lastPlayResult.success) {
      setBurstTrigger({
        color: lastPlayResult.color,
        isBonus: lastPlayResult.isFiveBonus,
        timestamp: lastPlayResult.timestamp,
      });

      const colorName = getColorName(lastPlayResult.color, t);
      setPlayToast({
        type: 'success',
        message: lastPlayResult.isFiveBonus
          ? t('hanabi.toast_five_bonus', { color: colorName })
          : t('hanabi.toast_firework_up', { color: colorName, level: lastPlayResult.fireworksLevel }),
        submessage: lastPlayResult.isFiveBonus
          ? t('hanabi.toast_five_bonus_sub', { user: lastPlayResult.userName })
          : t('hanabi.toast_firework_up_sub', { user: lastPlayResult.userName, color: colorName, number: lastPlayResult.number }),
      });
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);

      const colorName = getColorName(lastPlayResult.color, t);
      setPlayToast({
        type: 'error',
        message: t('hanabi.toast_explosion', { user: lastPlayResult.userName }),
        submessage: t('hanabi.toast_explosion_sub', { color: colorName, number: lastPlayResult.number, fuses: lastPlayResult.fuseTokens }),
      });
    }

    const timer = setTimeout(() => {
      setPlayToast(null);
    }, 4500);

    return () => clearTimeout(timer);
  }, [lastPlayResult, t]);

  useEffect(() => {
    if (!session?.access_token || !roomId) {
      navigate('/hub');
      return;
    }
    connect(roomId, session.access_token);
    return () => disconnect();
  }, [roomId, session]);

  if (!isConnected && !gameState && !isReconnecting) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#020617] text-purple-400 gap-4">
        <div className="animate-spin text-4xl">🎆</div>
        <p className="font-semibold text-lg">{t('hanabi.entering_hanabi', { roomId })}</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#020617] text-purple-400 gap-4">
        <div className="animate-spin text-4xl">⏳</div>
        <p className="font-semibold text-lg">{t('hanabi.loading_show_data')}</p>
      </div>
    );
  }

  const myId = session?.user?.id || '';
  const isLeader = gameState.players[0] === myId;
  const isMyTurn = gameState.state === 'PLAYING' && gameState.currentPlayer === myId;
  const canDiscard = gameState.clockTokens < 8;
  const myCards = gameState.hands[myId] || [];
  const otherPlayers = gameState.players.filter((p) => p !== myId);
  const activeMode = gameState.gameMode || 'classic';
  const isWildMode = activeMode === 'rainbow_wild';
  const activeFireworksColors = Object.keys(gameState.fireworks || {});
  const totalPlayers = gameState.players.length;

  const drawerTabs: TabOption[] = [
    { id: 'players', label: `Jogadores (${totalPlayers})`, icon: <Users size={14} /> },
    { id: 'rules', label: 'Regras', icon: <BookOpen size={14} /> },
    { id: 'log', label: 'Histórico', icon: <HistoryIcon size={14} /> },
    { id: 'discard', label: `Descartes (${gameState.discardPile.length})`, icon: <Trash2 size={14} /> },
  ];

  return (
    <GameShell
      themeClass="bg-[#020617] text-white"
      header={
        <GameHeader
          gameTitle="HANABI"
          gameBadge="CO-OP"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          accentColor="text-purple-300"
          onExit={() => {
            disconnect();
            navigate('/hub');
          }}
          onTogglePlayers={() => setDrawerTab('players')}
          onToggleRules={() => setDrawerTab('rules')}
          onToggleLog={() => setDrawerTab('log')}
          centerContent={
            gameState.state === 'PLAYING' ? (
              <div className="flex items-center gap-1.5 md:gap-2.5">
                {/* Dicas restantes */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold"
                  title="Fichas de Dica restantes"
                >
                  <span>💡</span>
                  <span>{gameState.clockTokens}/8</span>
                </div>

                {/* Fusíveis restantes */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono font-bold"
                  title="Erros / Fusíveis detonados"
                >
                  <span>💥</span>
                  <span>{gameState.fuseTokens}/3</span>
                </div>

                {/* Turn badge */}
                <div
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider hidden sm:flex items-center gap-1 ${
                    isMyTurn
                      ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 animate-pulse'
                      : 'bg-white/10 text-gray-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span>
                    {isMyTurn
                      ? 'Seu Turno!'
                      : (gameState.playerNames?.[gameState.currentPlayer] || 'Outro jogador')}
                  </span>
                </div>
              </div>
            ) : null
          }
        />
      }
      footer={
        /* 3. SUA PRÓPRIA MÃO DOCKED NA PARTE INFERIOR */
        gameState.state === 'PLAYING' ? (
          <div
            className={`w-full px-2 py-1.5 md:py-2 border-t backdrop-blur-md transition-colors ${
              isMyTurn
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                : 'bg-slate-950/80 border-purple-500/20'
            }`}
          >
            <div className="max-w-4xl mx-auto flex flex-col items-center gap-1.5">
              <div className="flex items-center justify-between w-full px-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-black uppercase tracking-wider text-[11px] md:text-xs ${
                    isMyTurn ? 'text-emerald-300' : 'text-purple-300'
                  }`}>
                    {isMyTurn ? t('hanabi.my_hand_turn') : t('hanabi.my_hand')}
                  </span>
                  <span className="text-[10px] text-gray-400 hidden sm:inline">
                    ({t('hanabi.my_hand_note')})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDiscardModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-gray-300 font-mono transition cursor-pointer"
                  >
                    <span>🗑️ {t('hanabi.discard')}: {gameState.discardPile.length}</span>
                  </button>
                  <span className="text-[10px] font-mono text-purple-300/80">
                    🎴 {t('hanabi.deck')}: {gameState.deckCount}
                  </span>
                </div>
              </div>

              {/* Cartas na Mão */}
              <div className="flex gap-2 md:gap-3 justify-center overflow-x-auto w-full py-0.5 px-1">
                {myCards.map((card, idx) => {
                  const isHinted =
                    gameState.lastAction?.type === 'CLUE' &&
                    gameState.lastAction.targetPlayerId === myId &&
                    gameState.lastAction.targetCardIds?.includes(card.id);

                  return (
                    <MyCard
                      key={card.id || idx}
                      card={card}
                      index={idx}
                      isMyTurn={isMyTurn}
                      canDiscard={canDiscard}
                      isHighlighted={isHinted}
                      onPlay={() => playCard(card.id)}
                      onDiscard={() => discardCard(card.id)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ) : null
      }
      overlay={
        <>
          {/* Partículas Pirotécnicas Leves em Canvas */}
          <FireworksCanvas
            burst={burstTrigger}
            isVictory={Boolean(gameState.state === 'GAME_OVER' && gameState.gameResult?.win)}
          />

          {/* Banner Flutuante de Feedback de Jogada */}
          <AnimatePresence>
            {playToast && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl border-2 backdrop-blur-xl shadow-2xl text-center max-w-md w-full ${
                  playToast.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                    : 'bg-red-950/90 border-red-500 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
                }`}
              >
                <div className="text-sm font-black tracking-wide">{playToast.message}</div>
                {playToast.submessage && (
                  <div className="text-[11px] mt-0.5 text-white/80">{playToast.submessage}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Banner de Reconexão */}
          {isReconnecting && (
            <div className="fixed top-0 left-0 right-0 bg-amber-950/95 border-b border-amber-500/50 p-2 z-50 flex items-center justify-center gap-3 text-amber-200 text-xs shadow-xl backdrop-blur-md">
              <span className="animate-spin text-sm">⏳</span>
              <span>{t('common.reconnecting', { attempt: reconnectAttempt })}</span>
              <button
                onClick={manualReconnect}
                className="px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] uppercase rounded transition-all cursor-pointer"
              >
                {t('common.reconnect_now')}
              </button>
            </div>
          )}

          {/* Banner de Espera quando outro jogador desconecta */}
          {disconnectNotice && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-red-950/95 border border-red-500/70 p-3 rounded-xl z-50 flex items-center gap-3 text-red-200 text-xs shadow-2xl backdrop-blur-md max-w-sm">
              <span className="text-xl animate-pulse">⚠️</span>
              <div>
                <p className="font-bold text-white">
                  {t('common.player_disconnected_wait', { name: disconnectNotice.userName })}
                </p>
                <p className="text-[10px] text-red-300 mt-0.5">
                  {t('common.match_paused')}
                </p>
              </div>
            </div>
          )}

          {/* Alerta de Erro */}
          {errorMsg && (
            <div
              className="fixed top-14 right-4 bg-red-950/95 border border-red-500 text-red-200 px-3.5 py-2 rounded-xl shadow-2xl z-50 cursor-pointer font-medium text-xs max-w-sm flex items-center justify-between gap-3"
              onClick={clearError}
            >
              <span>{errorMsg}</span>
              <span className="text-red-400 text-[10px] underline">{t('common.close')}</span>
            </div>
          )}

          {/* MODAL DE DAR DICA */}
          {clueModalTarget && (
            <GiveClueModal
              isOpen={Boolean(clueModalTarget)}
              onClose={() => setClueModalTarget(null)}
              targetPlayerName={gameState.playerNames?.[clueModalTarget] || t('common.player')}
              targetCards={gameState.hands[clueModalTarget] || []}
              isWildMode={isWildMode}
              onConfirmClue={(type, val) => giveClue(clueModalTarget, type, val)}
            />
          )}

          {/* MODAL DE DESCARTE */}
          <DiscardModal
            isOpen={isDiscardModalOpen}
            onClose={() => setIsDiscardModalOpen(false)}
            discardPile={gameState.discardPile || []}
            activeFireworksColors={activeFireworksColors}
          />

          {/* FIM DE JOGO */}
          {gameState.state === 'GAME_OVER' && gameState.gameResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`relative z-40 max-w-lg mx-auto text-center p-6 md:p-8 rounded-3xl border-3 backdrop-blur-2xl shadow-2xl ${
                  gameState.gameResult.win
                    ? 'bg-green-950/90 border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.4)]'
                    : 'bg-red-950/90 border-red-600 shadow-[0_0_80px_rgba(239,68,68,0.4)]'
                }`}
              >
                <div className="text-5xl mb-2">
                  {gameState.gameResult.win ? '🎆' : '💥'}
                </div>
                <h2
                  className={`text-3xl md:text-4xl font-black mb-2 ${
                    gameState.gameResult.win ? 'text-emerald-400' : 'text-red-500'
                  }`}
                >
                  {gameState.gameResult.win ? t('hanabi.game_over_win_title') : t('hanabi.game_over_loss_title')}
                </h2>

                <p className="text-gray-200 text-sm mb-4">{gameState.gameResult.message}</p>

                <div className="bg-black/60 px-6 py-3 rounded-2xl border border-white/10 mb-4 inline-block">
                  <span className="block text-[10px] uppercase text-gray-400 font-mono tracking-widest mb-0.5">
                    {t('hanabi.final_score')}
                  </span>
                  <span className="text-4xl font-black text-amber-400">
                    {gameState.gameResult.score} / {gameState.maxScore || 25}
                  </span>
                </div>

                <div className="mb-6 p-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="block text-[10px] text-purple-300 uppercase font-mono tracking-widest mb-0.5">
                    {t('hanabi.guild_verdict')}
                  </span>
                  <p className="text-sm font-semibold text-gray-100 italic">
                    "{gameState.gameResult.rating}"
                  </p>
                </div>

                <button
                  onClick={restartGame}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black tracking-wider uppercase rounded-xl shadow-lg transition active:scale-95 cursor-pointer text-sm"
                >
                  {t('hanabi.play_again')}
                </button>
              </motion.div>
            </div>
          )}
        </>
      }
    >
      {/* CONTEÚDO PRINCIPAL (DENTRO DO GAMESHELL) */}
      {gameState.state === 'LOBBY' ? (
        /* LOBBY: Seleção de Modos & Prontos com scroll limpo */
        <div className="w-full max-w-3xl mx-auto my-auto py-4 px-2 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-black text-purple-200 tracking-wide mb-1">
              {t('hanabi.lobby_title')}
            </h2>
            <p className="text-gray-400 text-xs md:text-sm">
              {t('hanabi.lobby_desc')}
            </p>
          </div>

          {/* SELEÇÃO DE VARIANTES DE REGRAS */}
          <div className="bg-black/50 border border-purple-900/40 rounded-2xl p-4 text-left shadow-2xl">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-widest">
                {t('hanabi.rules_variants_title')}
              </span>
              {isLeader && (
                <span className="text-[10px] text-amber-400 font-mono">
                  {t('hanabi.leader_badge')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
              {GAME_MODES.map((m) => {
                const isSelected = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    disabled={!isLeader}
                    onClick={() => isLeader && setGameOptions(m.id, gameState.perfectShow ?? false)}
                    className={`p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-950/70 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50'
                        : 'bg-black/40 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20'
                    } ${!isLeader ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.icon}</span>
                        <span className="font-black text-xs text-white">{t(`hanabi.modes.${m.id}.name`)}</span>
                      </div>
                      {isSelected && (
                        <span className="px-2 py-0.2 bg-purple-500 text-white font-black text-[9px] uppercase rounded-full">
                          {t('hanabi.mode_active')}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-purple-300/80 mb-0.5">
                      {t(`hanabi.modes.${m.id}.subtitle`)}
                    </span>
                    <p className="text-[11px] text-gray-300 leading-tight">{t(`hanabi.modes.${m.id}.desc`)}</p>
                  </button>
                );
              })}
            </div>

            {/* Toggle de Modificador: Show Perfeito */}
            <div
              onClick={() =>
                isLeader && setGameOptions(activeMode, !(gameState.perfectShow ?? false))
              }
              className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                gameState.perfectShow
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-black/40 border-white/10'
              } ${isLeader ? 'cursor-pointer hover:border-amber-400/50' : 'cursor-default'}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🏆</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-amber-200">
                      {t('hanabi.modifier_perfect_show_title')}
                    </span>
                    {gameState.perfectShow && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-black font-black text-[8px] uppercase rounded">
                        {t('hanabi.mode_active')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {t('hanabi.modifier_perfect_show_desc')}
                  </p>
                </div>
              </div>

              <div
                className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                  gameState.perfectShow ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    gameState.perfectShow ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* LISTA DE JOGADORES */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-left space-y-2 shadow-xl">
            <span className="text-[11px] font-bold text-purple-300 uppercase tracking-widest block mb-1">
              {t('hanabi.participants_count', { current: gameState.players.length })}
            </span>

            {gameState.players.map((pid) => {
              const isReady = gameState.playerReady?.[pid];
              const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
              const isMe = pid === myId;

              return (
                <div
                  key={pid}
                  className="flex justify-between items-center bg-black/60 px-3.5 py-2.5 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className={`text-xs font-medium ${isMe ? 'text-green-400 font-bold' : 'text-purple-200'}`}>
                      {pName} {isMe && t('common.you')}
                    </span>
                  </div>

                  {isMe ? (
                    <button
                      onClick={toggleReady}
                      className={`px-4 py-1.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                        isReady
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30 border border-emerald-400'
                          : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600'
                      }`}
                    >
                      <span>{isReady ? '✓' : '👍'}</span>
                      <span>{isReady ? t('hanabi.ready') : t('hanabi.not_ready')}</span>
                    </button>
                  ) : (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        isReady
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse'
                      }`}
                    >
                      {isReady ? t('hanabi.is_ready') : t('hanabi.waiting')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* BOTÃO DO LÍDER */}
          {isLeader && (
            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                onClick={startGame}
                disabled={
                  !gameState.players.every((p) => gameState.playerReady?.[p]) ||
                  gameState.players.length < 2
                }
                className="w-full max-w-sm py-3.5 bg-gradient-to-r from-red-500 via-purple-600 to-blue-500 hover:opacity-90 border-2 border-purple-300 rounded-xl font-black tracking-wider text-base transition-all shadow-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('hanabi.start_show')}
              </button>
              {gameState.players.length < 2 && (
                <p className="text-[11px] text-amber-400 font-medium">
                  {t('hanabi.min_players_warn')}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* PLAYING: STAGE ZERO-SCROLL */
        <div className="w-full h-full flex flex-col justify-between gap-1 md:gap-2 overflow-hidden py-1">
          
          {/* 1. MÃOS DOS PARCEIROS (TOPO - MAX ~28dvh) */}
          <div className="flex flex-wrap gap-2 md:gap-3 justify-center items-center overflow-x-auto max-h-[30dvh] shrink-0 px-1 py-1">
            {otherPlayers.map((pid) => {
              const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
              const pHand = gameState.hands[pid] || [];
              const isCurrent = pid === gameState.currentPlayer;

              return (
                <div
                  key={pid}
                  className={`bg-black/50 backdrop-blur-md px-2.5 py-1.5 md:p-3 rounded-2xl flex flex-col items-center gap-1.5 shadow-lg transition-all shrink-0 ${
                    isCurrent
                      ? 'border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                      : 'border border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-xs ${isCurrent ? 'text-amber-300' : 'text-purple-200'} truncate max-w-[100px]`}>
                        {pName}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[8px] font-black uppercase rounded-full tracking-wider animate-pulse">
                          {t('hanabi.turn_tag')}
                        </span>
                      )}
                    </div>

                    {isMyTurn && gameState.clockTokens > 0 ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setClueModalTarget(pid)}
                        className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow border border-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>💡</span>
                        <span>{t('hanabi.give_clue')}</span>
                      </motion.button>
                    ) : (
                      gameState.clockTokens === 0 && (
                        <span className="text-[9px] font-mono text-gray-500 uppercase">
                          {t('hanabi.zero_clues')}
                        </span>
                      )
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    {pHand.map((c) => {
                      const isHinted =
                        gameState.lastAction?.type === 'CLUE' &&
                        gameState.lastAction.targetPlayerId === pid &&
                        gameState.lastAction.targetCardIds?.includes(c.id);

                      return (
                        <TeammateCard key={c.id} card={c} isHighlighted={isHinted} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. MESA CENTRAL DE FOGUETES (MEIO - MAX ~28dvh) */}
          <motion.div
            animate={
              isShaking
                ? {
                    x: [-6, 6, -4, 4, -2, 2, 0],
                    y: [-2, 2, -1, 1, 0],
                  }
                : {}
            }
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col justify-center items-center gap-2 max-h-[34dvh] px-2"
          >
            {/* Pedestais de Fogos de Artifício */}
            <div className="flex gap-2 md:gap-3.5 justify-center flex-wrap items-center">
              {Object.entries(gameState.fireworks).map(([color, value]) => {
                const conf = COLOR_CONFIG[color] || COLOR_CONFIG.white;
                const isComplete = value === 5;
                const isRecentSuccessful =
                  lastPlayResult?.success && lastPlayResult?.color === color;

                return (
                  <motion.div
                    key={color}
                    animate={isRecentSuccessful ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`relative w-[clamp(58px,7.5vw,82px)] h-[clamp(88px,13dvh,124px)] aspect-[2/3] rounded-2xl border-2 flex flex-col items-center justify-between p-1.5 md:p-2 transition-all select-none ${
                      value > 0
                        ? `${conf.bg} ${conf.border} ${conf.glow}`
                        : 'bg-black/60 border-dashed border-gray-700/80'
                    }`}
                  >
                    <span
                      className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${
                        value > 0 && conf.text === 'text-slate-100'
                          ? 'text-slate-950 font-black'
                          : 'text-white'
                      }`}
                    >
                      {getColorShort(color, t)}
                    </span>

                    <div
                      className={`text-3xl md:text-4xl font-black drop-shadow-md leading-none my-auto ${
                        value > 0 && conf.text === 'text-slate-100'
                          ? 'text-slate-950'
                          : 'text-white'
                      }`}
                    >
                      {value > 0 ? value : '-'}
                    </div>

                    <span
                      className={`text-[8px] md:text-[9px] font-bold uppercase ${
                        isComplete ? 'text-amber-300 font-black' : 'text-white/70'
                      }`}
                    >
                      {isComplete ? '★ 5/5' : `${value}/5`}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Status Compacto e Mensagem de Ajuda do Turno */}
            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-1">
                <Flame size={13} className="text-amber-400" />
                <span>Score: <strong className="text-amber-300 font-bold">{Object.values(gameState.fireworks).reduce((a, b) => a + b, 0)}</strong>/25</span>
              </span>
              <span>•</span>
              <button
                onClick={() => setDrawerTab('log')}
                className="hover:text-purple-300 underline cursor-pointer truncate max-w-[240px]"
                title="Ver histórico pirotécnico"
              >
                {gameState.actionLog.length > 0 ? gameState.actionLog[gameState.actionLog.length - 1] : 'Início do Show'}
              </button>
            </div>
          </motion.div>

        </div>
      )}

      {/* DRAWER LATERAL PARA REGRAS, JOGADORES, LOG E DESCARTE */}
      <SideDrawer
        isOpen={Boolean(drawerTab)}
        onClose={() => setDrawerTab(null)}
        title="Painel Hanabi"
        tabs={drawerTabs}
        activeTab={drawerTab || 'players'}
        onTabChange={(tab) => setDrawerTab(tab as any)}
      >
        {drawerTab === 'players' && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono tracking-widest text-purple-300 mb-2">
              Equipe de Pirotécnicos ({gameState.players.length})
            </h4>
            <div className="space-y-2">
              {gameState.players.map((pid) => {
                const isOnline = gameState.playerConnected?.[pid] !== false;
                const isCurrent = gameState.currentPlayer === pid;
                const isMe = pid === myId;
                return (
                  <div
                    key={pid}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isCurrent
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : 'bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="font-bold text-sm text-gray-200">
                        {gameState.playerNames?.[pid] || pid.substring(0, 6)} {isMe && '(Você)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                          Turno
                        </span>
                      )}
                      <span className="text-xs font-mono text-gray-400">
                        {gameState.hands[pid]?.length || 0} cartas
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {drawerTab === 'rules' && (
          <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200">
              <h4 className="font-bold text-sm mb-1 flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-300" />
                Objetivo do Hanabi
              </h4>
              <p>
                Vocês formam uma equipe de pirotécnicos cooperando para montar o maior show de fogos de artifício! Construam as 5 pilhas de fogos na ordem 1 ➔ 2 ➔ 3 ➔ 4 ➔ 5.
              </p>
            </div>

            <div>
              <h5 className="font-bold text-gray-200 uppercase tracking-wider text-[11px] mb-1">
                A Regra de Ouro
              </h5>
              <p>
                Você segura suas cartas viradas para os outros jogadores — você <strong>nunca vê</strong> suas próprias cartas!
              </p>
            </div>

            <div>
              <h5 className="font-bold text-gray-200 uppercase tracking-wider text-[11px] mb-1">
                No Seu Turno (1 Ação)
              </h5>
              <ul className="space-y-1.5 list-disc pl-4">
                <li>
                  <strong className="text-blue-300">Dar uma Dica:</strong> Gasta 1 ficha de dica (💡). Escolha um colega e revele todas as cartas dele de uma determinada cor OU de um determinado número.
                </li>
                <li>
                  <strong className="text-gray-200">Descartar uma Carta:</strong> Recupera 1 ficha de dica (💡). A carta vai para a pilha de descartes e você compra uma nova.
                </li>
                <li>
                  <strong className="text-emerald-300">Jogar uma Carta:</strong> Tente jogar a próxima carta correta de uma cor (ex: 1 vermelho, depois 2 vermelho...). Se estiver errada, explode (💥) e gasta 1 fusível! (3 explosões = derrota imediata!).
                </li>
              </ul>
            </div>

            <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 text-[11px]">
              <strong className="text-amber-300">Bônus de 5:</strong> Ao completar qualquer fogo de artifício com a carta de número 5, a equipe recupera 1 ficha de dica bônus gratuitamente!
            </div>
          </div>
        )}

        {drawerTab === 'log' && (
          <div className="space-y-2">
            <h4 className="text-xs uppercase font-mono tracking-widest text-purple-300 mb-2">
              Histórico Pirotécnico ({gameState.actionLog.length})
            </h4>
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {gameState.actionLog.slice().reverse().map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-gray-300"
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}

        {drawerTab === 'discard' && (
          <div className="space-y-3">
            <h4 className="text-xs uppercase font-mono tracking-widest text-purple-300 mb-2">
              Cartas Descartadas ({gameState.discardPile.length})
            </h4>
            <p className="text-xs text-gray-400">
              Cartas descartadas estão fora do jogo. Lembre-se: existem três 1s, dois 2s, dois 3s, dois 4s e apenas um 5 em cada cor!
            </p>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
              {activeFireworksColors.map((color) => {
                const conf = COLOR_CONFIG[color] || COLOR_CONFIG.white;
                const numbers = gameState.discardPile
                  .filter((c) => c.color === color)
                  .map((c) => c.number)
                  .sort((a, b) => a - b);

                return (
                  <div
                    key={color}
                    className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2"
                  >
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${conf.bg} ${conf.text === 'text-slate-100' ? 'text-slate-950 font-black' : 'text-white'}`}>
                      {getColorShort(color, t)}
                    </span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {numbers.length === 0 ? (
                        <span className="text-[11px] text-gray-500 italic">Nenhuma</span>
                      ) : (
                        numbers.map((n, i) => (
                          <span
                            key={i}
                            className="w-6 h-6 rounded bg-black/70 border border-white/20 font-black text-xs text-gray-200 flex items-center justify-center"
                          >
                            {n}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SideDrawer>
    </GameShell>
  );
}
