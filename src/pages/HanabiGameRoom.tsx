import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHanabiStore, type HanabiCard } from '../store/useHanabiStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FireworksCanvas } from '../components/FireworksCanvas';
import { LanguageSelector } from '../components/LanguageSelector';

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
      whileHover={{ y: -6, scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative w-24 h-36 rounded-xl border-2 flex flex-col items-center justify-between p-2 shadow-xl transition-all ${conf.bg} ${conf.border} ${conf.glow} ${
        isHighlighted ? 'ring-4 ring-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.9)] scale-105' : ''
      }`}
    >
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap animate-bounce z-20">
          {t('hanabi.clue_badge')}
        </div>
      )}

      <div className="w-full flex justify-between items-center text-xs font-black">
        <span className={isWhite ? 'text-slate-950' : 'text-white'}>{card.number}</span>
        <span
          className={`text-[10px] uppercase font-bold tracking-wider ${
            isWhite ? 'text-slate-700' : 'text-white/90'
          }`}
        >
          {getColorShort(card.color, t)}
        </span>
      </div>

      <div
        className={`text-4xl font-black ${
          isWhite ? 'text-slate-950' : 'text-white'
        } drop-shadow-md`}
      >
        {card.number}
      </div>

      {/* Etiquetas do que o dono já sabe sobre a carta */}
      <div className="w-full flex flex-wrap gap-1 justify-center">
        {card.known_color && (
          <span className="px-1 py-0.2 bg-black/75 text-white rounded text-[9px] font-bold uppercase border border-white/20">
            {getColorShort(card.known_color, t)}
          </span>
        )}
        {card.known_number ? (
          <span className="px-1 py-0.2 bg-black/75 text-amber-300 rounded text-[9px] font-black border border-white/20">
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex flex-col items-center gap-2 group"
    >
      <div
        className={`relative w-28 h-44 rounded-2xl border-2 p-3 flex flex-col justify-between shadow-2xl transition-all duration-300 ${
          isHighlighted ? 'ring-4 ring-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.9)] scale-105 animate-pulse' : ''
        } ${
          knownConf
            ? `bg-slate-950/90 ${knownConf.border} ${knownConf.glow}`
            : 'bg-slate-900/90 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
        }`}
      >
        {isHighlighted && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap z-20 animate-bounce">
            {t('hanabi.new_clue_badge')}
          </div>
        )}

        {/* Padrão visual do verso da carta */}
        <div className="absolute inset-0 bg-radial from-purple-900/20 via-transparent to-black/60 rounded-2xl pointer-events-none" />

        <div className="flex justify-between items-center text-xs font-mono text-purple-300/60 z-10">
          <span>#{index + 1}</span>
          <span>🎆</span>
        </div>

        {/* Informações que você sabe sobre a sua carta */}
        <div className="flex flex-col items-center justify-center gap-2 my-auto z-10">
          {card.known_number ? (
            <div className="text-4xl font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
              {card.known_number}
            </div>
          ) : (
            <div className="text-3xl text-gray-500 font-bold">?</div>
          )}

          <div className="flex flex-wrap gap-1 justify-center">
            {knownConf && card.known_color ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${knownConf.bg} ${
                  knownConf.text === 'text-slate-100' ? 'text-slate-950 font-black' : 'text-white'
                }`}
              >
                {getColorShort(card.known_color, t)}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-black/50 border border-white/10 rounded-full text-[10px] text-gray-400 font-mono">
                {t('hanabi.color_unknown')}
              </span>
            )}
          </div>
        </div>

        <div className="text-[10px] text-center text-gray-500 uppercase font-mono z-10">
          {card.known_color || card.known_number ? t('hanabi.clue_recorded') : t('hanabi.no_clues')}
        </div>
      </div>

      {/* Botões de Ação no seu turno */}
      {isMyTurn && (
        <div className="flex gap-1.5 w-full">
          <button
            onClick={onPlay}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 shadow-emerald-500/20"
            title={t('hanabi.play_card_tooltip')}
          >
            {t('hanabi.play_card')}
          </button>
          <button
            onClick={onDiscard}
            disabled={!canDiscard}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-600 text-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
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

  // Extrai as cores únicas que o alvo possui. No modo Wild, não é permitido dar dica de "multicolor" diretamente
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(168,85,247,0.3)] text-white"
      >
        <div className="flex justify-between items-center mb-4 border-b border-purple-900/50 pb-3">
          <h3 className="text-xl font-black text-purple-200">
            {t('hanabi.give_clue_modal_title', { name: targetPlayerName })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold">
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-300 mb-4">
          {t('hanabi.give_clue_modal_desc')}
          {isWildMode && (
            <span className="block mt-1 text-fuchsia-300 font-medium">
              {t('hanabi.give_clue_modal_wild_desc')}
            </span>
          )}
        </p>

        {/* Prévia da mão do colega destacando as cartas correspondentes */}
        <div className="flex gap-2 justify-center mb-6 p-4 bg-black/50 rounded-xl border border-white/10">
          {targetCards.map((card, i) => {
            const isMatch =
              (selectedType === 'color' &&
                (card.color === activeColor || (isWildMode && card.color === 'multicolor'))) ||
              (selectedType === 'number' && card.number === activeNumber);

            return (
              <div
                key={card.id || i}
                className={`relative transition-all duration-200 ${
                  isMatch ? 'scale-110 z-10 -translate-y-2' : 'opacity-40 grayscale-[0.4]'
                }`}
              >
                <TeammateCard card={card} />
                {isMatch && (
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                    {t('hanabi.clue_badge')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Seleção do Tipo de Dica */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setSelectedType('color');
              setSelectedValue(availableColors[0] || '');
            }}
            className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
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
            className={`flex-1 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
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
          <div className="grid grid-cols-3 gap-2 mb-6">
            {availableColors.map((col) => {
              const conf = COLOR_CONFIG[col] || COLOR_CONFIG.white;
              const isSelected = activeColor === col;
              return (
                <button
                  key={col}
                  onClick={() => setSelectedValue(col)}
                  className={`py-2 px-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
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
          <div className="flex gap-2 justify-center mb-6">
            {availableNumbers.map((num) => {
              const isSelected = activeNumber === num;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedValue(num)}
                  className={`w-12 h-12 rounded-xl font-black text-lg flex items-center justify-center border transition-all ${
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

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95"
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-white max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
          <h3 className="text-xl font-black text-purple-200">
            {t('hanabi.discarded_modal_title', { count: discardPile.length })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-bold text-lg">
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          {t('hanabi.discarded_modal_desc')}
        </p>

        <div className="space-y-4 overflow-y-auto flex-grow pr-2">
          {Object.entries(grouped).map(([color, numbers]) => {
            const conf = COLOR_CONFIG[color] || COLOR_CONFIG.white;
            numbers.sort((a, b) => a - b);

            return (
              <div
                key={color}
                className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center gap-4"
              >
                <span
                  className={`px-3 py-1 rounded text-xs font-bold uppercase w-28 text-center ${
                    conf.bg
                  } ${conf.text === 'text-slate-100' ? 'text-slate-950 font-black' : 'text-white'}`}
                >
                  {getColorShort(color, t)} ({getColorName(color, t)})
                </span>

                <div className="flex gap-2 flex-wrap flex-grow">
                  {numbers.length === 0 ? (
                    <span className="text-xs text-gray-500 italic">{t('hanabi.none_discarded')}</span>
                  ) : (
                    numbers.map((num, i) => (
                      <span
                        key={i}
                        className="w-8 h-8 rounded-lg bg-black/60 border border-white/20 font-black flex items-center justify-center text-sm text-gray-200"
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
          className="mt-6 w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs uppercase tracking-wider rounded-xl transition"
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

  const [copied, setCopied] = useState(false);
  const [clueModalTarget, setClueModalTarget] = useState<string | null>(null);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

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
      // Jogada errada: tela treme e detona fusível
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

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  return (
    <div className="relative min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans overflow-x-hidden flex flex-col justify-between">
      <div className="crt-overlay" />

      {/* Partículas Pirotécnicas Leves em Canvas (Único Canvas Otimizado para Toda a Tela) */}
      <FireworksCanvas
        burst={burstTrigger}
        isVictory={Boolean(gameState.state === 'GAME_OVER' && gameState.gameResult?.win)}
      />

      {/* Luz ambiente de fundo e estrelas */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[450px] bg-purple-900/15 blur-[150px] rounded-full pointer-events-none" />

      {/* Banner Flutuante de Feedback de Jogada */}
      <AnimatePresence>
        {playToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl border-2 backdrop-blur-xl shadow-2xl text-center max-w-lg w-full ${
              playToast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                : 'bg-red-950/90 border-red-500 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
            }`}
          >
            <div className="text-base font-black tracking-wide">{playToast.message}</div>
            {playToast.submessage && (
              <div className="text-xs mt-1 text-white/80">{playToast.submessage}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de Reconexão do próprio jogador */}
      {isReconnecting && (
        <div className="fixed top-0 left-0 right-0 bg-amber-950/95 border-b border-amber-500/50 p-3 z-50 flex items-center justify-center gap-4 text-amber-200 text-sm shadow-xl backdrop-blur-md">
          <span className="animate-spin text-base">⏳</span>
          <span>{t('common.reconnecting', { attempt: reconnectAttempt })}</span>
          <button
            onClick={manualReconnect}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded transition-all"
          >
            {t('common.reconnect_now')}
          </button>
        </div>
      )}

      {/* Banner de Espera quando outro jogador desconecta */}
      {disconnectNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-red-950/95 border border-red-500/70 p-4 rounded-xl z-50 flex items-center gap-4 text-red-200 text-sm shadow-2xl backdrop-blur-md max-w-lg">
          <span className="text-2xl animate-pulse">⚠️</span>
          <div>
            <p className="font-bold text-white">
              {t('common.player_disconnected_wait', { name: disconnectNotice.userName })}
            </p>
            <p className="text-xs text-red-300 mt-0.5">
              {t('common.match_paused')}
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Erro */}
      {errorMsg && (
        <div
          className="fixed top-4 right-4 bg-red-950/95 border border-red-500 text-red-200 p-4 rounded-xl shadow-2xl z-50 cursor-pointer font-medium max-w-md flex items-center justify-between gap-4"
          onClick={clearError}
        >
          <span>
            <strong>{t('common.attention')}:</strong> {errorMsg}
          </span>
          <span className="text-red-400 text-xs underline">{t('common.close')}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="relative z-10 mb-6 flex flex-col md:flex-row justify-between items-center border-b-2 border-purple-900/50 pb-4 gap-4">
        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-4">
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-blue-400 neon-text-shadow">
            HANABI
          </h1>
          <div className="flex items-center gap-3 flex-wrap font-mono text-sm uppercase tracking-wider">
            <span className="text-gray-400">
              {t('common.room')}: <span className="text-purple-300 font-bold">{roomId}</span>
            </span>
            <button
              onClick={handleCopyInvite}
              className="px-2.5 py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded font-mono text-xs uppercase tracking-wider transition-all"
            >
              {copied ? t('common.copied') : t('common.copy_invite')}
            </button>
          </div>
        </div>

        {/* Status de Turno / Jogadores */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {gameState.state === 'PLAYING' && (
            <div
              className={`px-4 py-1.5 rounded-xl border font-bold text-xs uppercase tracking-wider shadow-md ${
                isMyTurn
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 animate-pulse'
                  : 'bg-purple-950/50 border-purple-500/30 text-purple-300'
              }`}
            >
              {isMyTurn
                ? t('hanabi.your_turn_banner')
                : t('hanabi.turn_of_player', { name: gameState.playerNames?.[gameState.currentPlayer] || t('common.player') })}
            </div>
          )}

          <div className="flex items-center gap-2">
            {gameState.players.map((p) => {
              const isOnline = gameState.playerConnected?.[p] !== false;
              const isCurrent = gameState.currentPlayer === p;
              return (
                <span
                  key={p}
                  className={`px-2.5 py-1 text-xs rounded border font-medium ${
                    isCurrent ? 'ring-2 ring-amber-400' : ''
                  } ${
                    isOnline
                      ? 'bg-green-950/50 border-green-500/30 text-green-400'
                      : 'bg-red-950/50 border-red-500/40 text-red-400'
                  }`}
                >
                  {gameState.playerNames?.[p] || p.substring(0, 6)}
                </span>
              );
            })}
          </div>

          <LanguageSelector />

          <button
            onClick={() => {
              disconnect();
              navigate('/hub');
            }}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/80 border border-red-500/50 text-red-400 font-semibold text-xs uppercase tracking-wider rounded-lg transition-all"
          >
            {t('common.exit_room')}
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="relative z-10 flex-grow flex flex-col justify-between">
        {/* LOBBY: Seleção de Modos & Prontos */}
        {gameState.state === 'LOBBY' && (
          <div className="max-w-3xl mx-auto my-auto text-center space-y-6 w-full py-4">
            <div>
              <h2 className="text-3xl font-black text-purple-200 tracking-wide mb-1">
                {t('hanabi.lobby_title')}
              </h2>
              <p className="text-gray-400 text-sm">
                {t('hanabi.lobby_desc')}
              </p>
            </div>

            {/* SELEÇÃO DE VARIANTES DE REGRAS */}
            <div className="bg-black/50 border border-purple-900/40 rounded-2xl p-5 text-left shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">
                  {t('hanabi.rules_variants_title')}
                </span>
                {isLeader && (
                  <span className="text-[11px] text-amber-400 font-mono">
                    {t('hanabi.leader_badge')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {GAME_MODES.map((m) => {
                  const isSelected = activeMode === m.id;
                  return (
                    <button
                      key={m.id}
                      disabled={!isLeader}
                      onClick={() => isLeader && setGameOptions(m.id, gameState.perfectShow ?? false)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-purple-950/70 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] ring-2 ring-purple-400/50'
                          : 'bg-black/40 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20'
                      } ${!isLeader ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{m.icon}</span>
                          <span className="font-black text-sm text-white">{t(`hanabi.modes.${m.id}.name`)}</span>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-purple-500 text-white font-black text-[10px] uppercase rounded-full">
                            {t('hanabi.mode_active')}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-purple-300/80 mb-1">
                        {t(`hanabi.modes.${m.id}.subtitle`)}
                      </span>
                      <p className="text-xs text-gray-300 leading-relaxed">{t(`hanabi.modes.${m.id}.desc`)}</p>
                    </button>
                  );
                })}
              </div>

              {/* Toggle de Modificador: Show Perfeito */}
              <div
                onClick={() =>
                  isLeader && setGameOptions(activeMode, !(gameState.perfectShow ?? false))
                }
                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  gameState.perfectShow
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                    : 'bg-black/40 border-white/10'
                } ${isLeader ? 'cursor-pointer hover:border-amber-400/50' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-amber-200">
                        {t('hanabi.modifier_perfect_show_title')}
                      </span>
                      {gameState.perfectShow && (
                        <span className="px-2 py-0.2 bg-amber-500 text-black font-black text-[9px] uppercase rounded">
                          {t('hanabi.mode_active')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('hanabi.modifier_perfect_show_desc')}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    gameState.perfectShow ? 'bg-amber-500' : 'bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      gameState.perfectShow ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* LISTA DE JOGADORES */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 text-left space-y-3 shadow-xl">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-widest block mb-1">
                {t('hanabi.participants_count', { current: gameState.players.length })}
              </span>

              {gameState.players.map((pid) => {
                const isReady = gameState.playerReady?.[pid];
                const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                const isMe = pid === myId;

                return (
                  <div
                    key={pid}
                    className="flex justify-between items-center bg-black/60 p-3.5 rounded-xl border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <span className={`font-medium ${isMe ? 'text-green-400 font-bold' : 'text-purple-200'}`}>
                        {pName} {isMe && t('common.you')}
                      </span>
                    </div>

                    {isMe ? (
                      <button
                        onClick={toggleReady}
                        className={`px-5 py-2 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 ${
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
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
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
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  onClick={startGame}
                  disabled={
                    !gameState.players.every((p) => gameState.playerReady?.[p]) ||
                    gameState.players.length < 2
                  }
                  className="px-10 py-5 bg-gradient-to-r from-red-500 via-purple-600 to-blue-500 hover:opacity-90 border-2 border-purple-300 rounded-2xl font-black tracking-wider text-xl transition-all shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('hanabi.start_show')}
                </button>
                {gameState.players.length < 2 && (
                  <p className="text-xs text-amber-400 font-medium">
                    {t('hanabi.min_players_warn')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* EM JOGO */}
        {gameState.state === 'PLAYING' && (
          <div className="flex flex-col justify-between flex-grow gap-6">
            
            {/* BANNER DE TRANSIÇÃO E INDICAÇÃO DE TURNO */}
            {isMyTurn ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-4xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-900/90 to-emerald-950/90 border-2 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.4)] flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl animate-bounce">✨</span>
                  <div>
                    <h3 className="text-base font-black text-emerald-300 uppercase tracking-wider">
                      {t('hanabi.your_turn_banner')}
                    </h3>
                    <p className="text-xs text-emerald-100/90 font-medium">
                      {t('hanabi.your_turn_desc')}
                    </p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full shadow shrink-0 animate-pulse">
                  {t('hanabi.your_turn_tag')}
                </span>
              </motion.div>
            ) : (
              <div className="w-full max-w-4xl mx-auto p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center gap-3 text-xs font-medium text-purple-200">
                <span className="animate-spin text-sm">⏳</span>
                <span>
                  {t('hanabi.waiting_teammate', { name: gameState.playerNames?.[gameState.currentPlayer] || t('common.player') })}
                </span>
              </div>
            )}

            {/* 1. MÃOS DOS PARCEIROS (TOPO) */}
            <div className="flex flex-wrap gap-6 justify-center items-start">
              {otherPlayers.map((pid) => {
                const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                const pHand = gameState.hands[pid] || [];
                const isCurrent = pid === gameState.currentPlayer;

                return (
                  <div
                    key={pid}
                    className={`bg-black/60 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center gap-3 shadow-xl transition-all ${
                      isCurrent
                        ? 'border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
                        : 'border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${isCurrent ? 'text-amber-300' : 'text-purple-200'}`}>
                          {pName}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black uppercase rounded-full tracking-wider animate-pulse">
                            {t('hanabi.turn_tag')}
                          </span>
                        )}
                      </div>

                      {isMyTurn && gameState.clockTokens > 0 ? (
                        <motion.button
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setClueModalTarget(pid)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300 flex items-center gap-1.5 active:scale-95"
                        >
                          <span>💡</span>
                          <span>{t('hanabi.give_clue')}</span>
                        </motion.button>
                      ) : (
                        gameState.clockTokens === 0 && (
                          <span className="text-[10px] font-mono text-gray-500 uppercase">
                            {t('hanabi.zero_clues')}
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex gap-2">
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

            {/* 2. MESA CENTRAL DE FOGUETES & RECURSOS */}
            <motion.div
              animate={
                isShaking
                  ? {
                      x: [-8, 8, -6, 6, -3, 3, 0],
                      y: [-3, 3, -2, 2, 0],
                    }
                  : {}
              }
              transition={{ duration: 0.4 }}
              className="flex flex-col md:flex-row items-center justify-between gap-6 my-2 bg-black/40 border border-white/5 rounded-3xl p-6 shadow-2xl"
            >
              {/* Painel de Recursos (Fichas & Baralho) */}
              <div className="flex flex-col gap-3 min-w-[220px]">
                {/* Fichas Azuis de Dica */}
                <div className="flex items-center justify-between bg-blue-950/40 border border-blue-500/30 p-2.5 rounded-xl">
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                    {t('hanabi.clues_token', { current: gameState.clockTokens })}
                  </span>
                  <div className="flex gap-1">
                    {[...Array(8)].map((_, i) => (
                      <span
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all ${
                          i < gameState.clockTokens
                            ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                            : 'bg-gray-800 border border-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Fichas Pretas de Fusível (Erros) */}
                <div className="flex items-center justify-between bg-red-950/40 border border-red-500/30 p-2.5 rounded-xl">
                  <span className="text-xs font-bold text-red-300 uppercase tracking-wider">
                    {t('hanabi.errors_token')}
                  </span>
                  <div className="flex gap-1.5">
                    {[...Array(3)].map((_, i) => (
                      <span
                        key={i}
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-all ${
                          i < gameState.fuseTokens
                            ? 'bg-red-600 text-white font-black shadow-[0_0_12px_rgba(239,68,68,1)] animate-bounce'
                            : 'bg-black/60 border border-gray-700 text-gray-600'
                        }`}
                      >
                        {i < gameState.fuseTokens ? '💥' : '○'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status do Baralho & Descarte */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-black/50 border border-white/10 p-2 rounded-xl text-center">
                    <span className="block text-[10px] text-gray-400 uppercase font-mono">
                      {t('hanabi.deck')}
                    </span>
                    <span className="text-lg font-black text-purple-300">
                      {gameState.deckCount}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsDiscardModalOpen(true)}
                    className="flex-1 bg-black/50 hover:bg-black/80 border border-white/10 hover:border-purple-400 p-2 rounded-xl text-center transition"
                  >
                    <span className="block text-[10px] text-gray-400 uppercase font-mono">
                      {t('hanabi.discard')}
                    </span>
                    <span className="text-lg font-black text-amber-400">
                      {gameState.discardPile.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Foguetes de Artifício da Apresentação (5 ou 6 pedestais) */}
              <div className="flex gap-3 md:gap-4 justify-center flex-wrap">
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
                      className={`relative w-24 h-36 rounded-2xl border-2 flex flex-col items-center justify-between p-3 transition-all ${
                        value > 0
                          ? `${conf.bg} ${conf.border} ${conf.glow}`
                          : 'bg-black/60 border-dashed border-gray-700'
                      }`}
                    >
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          value > 0 && conf.text === 'text-slate-100'
                            ? 'text-slate-950 font-black'
                            : 'text-white'
                        }`}
                      >
                        {getColorShort(color, t)}
                      </span>

                      <div
                        className={`text-5xl font-black drop-shadow-lg ${
                          value > 0 && conf.text === 'text-slate-100'
                            ? 'text-slate-950'
                            : 'text-white'
                        }`}
                      >
                        {value > 0 ? value : '-'}
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase ${
                          isComplete ? 'text-amber-300 font-black' : 'text-white/70'
                        }`}
                      >
                        {isComplete ? t('hanabi.firework_complete') : `${value}/5`}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Feed de Ações Recentes */}
              <div className="bg-black/50 border border-white/10 p-3 rounded-xl max-w-xs w-full h-36 overflow-y-auto text-xs space-y-1.5 font-sans">
                <span className="text-[10px] uppercase font-mono text-gray-400 tracking-wider block border-b border-white/5 pb-1">
                  {t('hanabi.pyrotechnic_log')}
                </span>
                {gameState.actionLog.slice(-5).map((log, idx) => (
                  <p key={idx} className="text-gray-300 leading-snug">
                    {log}
                  </p>
                ))}
              </div>
            </motion.div>

            {/* 3. SUA PRÓPRIA MÃO (PARTE INFERIOR) */}
            <div
              className={`flex flex-col items-center gap-3 p-4 rounded-3xl transition-all ${
                isMyTurn
                  ? 'bg-emerald-950/25 border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                  : 'bg-black/30 border border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black uppercase tracking-wider ${isMyTurn ? 'text-emerald-300' : 'text-purple-200'}`}>
                  {isMyTurn ? t('hanabi.my_hand_turn') : t('hanabi.my_hand')}
                </span>
                <span className="text-xs text-gray-400 italic">
                  {t('hanabi.my_hand_note')}
                </span>
              </div>

              <div className="flex gap-4 flex-wrap justify-center">
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
        )}

        {/* FIM DE JOGO: Animações Específicas de Vitória e Derrota */}
        {gameState.state === 'GAME_OVER' && gameState.gameResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`relative z-40 max-w-2xl mx-auto text-center p-8 rounded-3xl border-4 backdrop-blur-2xl shadow-2xl ${
                gameState.gameResult.win
                  ? 'bg-green-950/85 border-emerald-400 shadow-[0_0_100px_rgba(16,185,129,0.4)]'
                  : 'bg-red-950/85 border-red-600 shadow-[0_0_100px_rgba(239,68,68,0.4)]'
              }`}
            >
              <div className="text-6xl mb-3">
                {gameState.gameResult.win ? '🎆' : '💥'}
              </div>
              <h2
                className={`text-4xl md:text-5xl font-black mb-3 ${
                  gameState.gameResult.win ? 'text-emerald-400' : 'text-red-500'
                }`}
              >
                {gameState.gameResult.win ? t('hanabi.game_over_win_title') : t('hanabi.game_over_loss_title')}
              </h2>

              <p className="text-gray-200 text-lg mb-6">{gameState.gameResult.message}</p>

              <div className="bg-black/60 p-4 rounded-2xl border border-white/10 mb-6 inline-block">
                <span className="block text-xs uppercase text-gray-400 font-mono tracking-widest mb-1">
                  {t('hanabi.final_score')}
                </span>
                <span className="text-5xl font-black text-amber-400">
                  {gameState.gameResult.score} / {gameState.maxScore || 25}
                </span>
              </div>

              <div className="mb-8 p-4 bg-black/40 rounded-xl border border-white/5">
                <span className="block text-[11px] text-purple-300 uppercase font-mono tracking-widest mb-1">
                  {t('hanabi.guild_verdict')}
                </span>
                <p className="text-base font-semibold text-gray-100 italic">
                  "{gameState.gameResult.rating}"
                </p>
              </div>

              <button
                onClick={restartGame}
                className="px-10 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black tracking-wider uppercase rounded-xl shadow-lg transition active:scale-95"
              >
                {t('hanabi.play_again')}
              </button>
            </motion.div>
          </div>
        )}
      </main>

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
    </div>
  );
}
