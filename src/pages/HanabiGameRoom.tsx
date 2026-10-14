import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHanabiStore, type HanabiCard } from '../store/useHanabiStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { FireworksCanvas } from '../components/FireworksCanvas';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { type TabOption } from '../components/game/SideDrawer';
import { GameLobby, type LobbyPlayer } from '../components/game/GameLobby';
import { lobbyBlockReason } from '../lib/gameUi';
import {
  StatusPill,
  GameNotice,
  ConnectionNotices,
  GameLoading,
  PlayerRow,
  RulesList,
  ResultModal,
  EmptyState,
} from '../components/game/ui';
import {
  Users,
  BookOpen,
  History as HistoryIcon,
  Trash2,
  Flame,
  Sparkles,
  Lightbulb,
  Layers,
  Rainbow,
  Zap,
  Shuffle,
  Trophy,
  X,
  Home,
  RotateCcw,
  Play,
} from 'lucide-react';

// Cores do Hanabi: fundo da carta e cor do texto sobre ela
const COLOR_CONFIG: Record<string, { bg: string; ink: string; border: string }> = {
  red: { bg: 'bg-red-500', ink: 'text-white', border: 'border-red-300' },
  yellow: { bg: 'bg-yellow-400', ink: 'text-yellow-950', border: 'border-yellow-200' },
  green: { bg: 'bg-green-500', ink: 'text-green-950', border: 'border-green-300' },
  blue: { bg: 'bg-blue-500', ink: 'text-white', border: 'border-blue-300' },
  white: { bg: 'bg-slate-100', ink: 'text-slate-900', border: 'border-white' },
  multicolor: {
    bg: 'bg-gradient-to-br from-red-500 via-yellow-400 via-green-500 to-blue-500',
    ink: 'text-white',
    border: 'border-white/80',
  },
};

const getColorName = (color: string, t: (k: string) => string) => t(`hanabi.colors.${color}`) || color;
const getColorShort = (color: string, t: (k: string) => string) =>
  t(`hanabi.colors_short.${color}`) || color.substring(0, 4).toUpperCase();

const GAME_MODES = [
  { id: 'classic', icon: Sparkles },
  { id: 'rainbow_full', icon: Rainbow },
  { id: 'rainbow_one', icon: Zap },
  { id: 'rainbow_wild', icon: Shuffle },
];

/** Carta de um parceiro (face visível). Compacta no celular, maior no desktop. */
function TeammateCard({ card, isHighlighted }: { card: HanabiCard; isHighlighted?: boolean }) {
  const { t } = useTranslation();
  const conf = COLOR_CONFIG[card.color] || COLOR_CONFIG.white;
  const known = [card.known_color ? getColorShort(card.known_color, t) : null, card.known_number ? `#${card.known_number}` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="img"
      aria-label={`${getColorName(card.color, t)} ${card.number}${known ? ` — ${t('hanabi.they_know')}: ${known}` : ''}`}
      title={known ? `${t('hanabi.they_know')}: ${known}` : undefined}
      className={`relative w-8 md:w-[clamp(52px,4.4vw,76px)] aspect-[2/3] rounded-md md:rounded-xl border-2 flex flex-col items-center justify-center md:justify-between md:p-1.5 select-none shrink-0 ${conf.bg} ${conf.border} ${conf.ink} ${
        isHighlighted ? 'ring-3 ring-accent ring-offset-2 ring-offset-ground' : ''
      }`}
    >
      <span className="hidden md:block self-start text-xs font-bold uppercase leading-none">{getColorShort(card.color, t)}</span>
      <span className="font-display font-bold text-lg md:text-3xl leading-none">{card.number}</span>
      {/* O que o dono já sabe */}
      <span className="hidden md:flex gap-0.5 min-h-4">
        {card.known_color && <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true" />}
        {card.known_number ? <span className="w-2 h-2 rounded-sm bg-current" aria-hidden="true" /> : null}
      </span>
      {(card.known_color || card.known_number) && (
        <span className="md:hidden absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1 rounded-full bg-white/90" aria-hidden="true" />
      )}
    </div>
  );
}

/** Sua carta (face oculta) com as dicas recebidas. É um botão: toque para selecionar. */
function MyCard({
  card,
  index,
  isSelected,
  isHighlighted,
  selectable,
  onSelect,
}: {
  card: HanabiCard;
  index: number;
  isSelected: boolean;
  isHighlighted?: boolean;
  selectable: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const knownConf = card.known_color ? COLOR_CONFIG[card.known_color] : null;
  const label = [
    t('hanabi.card_n', { n: index + 1 }),
    card.known_color ? getColorName(card.known_color, t) : null,
    card.known_number ? String(card.known_number) : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <motion.button
      type="button"
      layout
      disabled={!selectable}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={label}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: isSelected ? -8 : 0 }}
      transition={{ duration: 0.2 }}
      className={`relative flex-1 max-w-24 aspect-[2/3] rounded-xl border-2 p-1.5 md:p-2 flex flex-col items-center justify-between select-none transition-colors ${
        isSelected ? 'bg-accent-soft border-accent' : 'bg-raised border-line-strong'
      } ${selectable ? 'cursor-pointer hover:border-accent-line' : 'cursor-default'} ${
        isHighlighted ? 'ring-3 ring-accent ring-offset-2 ring-offset-surface' : ''
      }`}
    >
      <span className={`w-full h-1.5 rounded-full ${knownConf ? knownConf.bg : 'bg-line-strong'}`} aria-hidden="true" />
      <span className={`font-display font-bold leading-none ${card.known_number ? 'text-3xl md:text-4xl text-ink' : 'text-2xl text-muted'}`}>
        {card.known_number || '?'}
      </span>
      <span className="text-xs font-bold text-body leading-none truncate max-w-full">
        {card.known_color ? getColorShort(card.known_color, t) : `#${index + 1}`}
      </span>
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip chip-accent bg-accent text-accent-ink whitespace-nowrap">
          {t('hanabi.new_clue_badge')}
        </span>
      )}
    </motion.button>
  );
}

function GiveClueModal({
  targetPlayerName,
  targetCards,
  isWildMode,
  onClose,
  onConfirmClue,
}: {
  targetPlayerName: string;
  targetCards: HanabiCard[];
  isWildMode: boolean;
  onClose: () => void;
  onConfirmClue: (type: 'color' | 'number', value: string | number) => void;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<'color' | 'number'>('color');
  const [selectedValue, setSelectedValue] = useState<string | number>('');

  const availableColors = Array.from(new Set(targetCards.map((c) => c.color))).filter((col) => !(isWildMode && col === 'multicolor'));
  const availableNumbers = Array.from(new Set(targetCards.map((c) => c.number))).sort((a, b) => a - b);

  const activeColor = selectedType === 'color' ? (selectedValue as string) || availableColors[0] : '';
  const activeNumber = selectedType === 'number' ? (selectedValue as number) || availableNumbers[0] : 0;

  const handleConfirm = () => {
    if (selectedType === 'color' && activeColor) onConfirmClue('color', activeColor);
    else if (selectedType === 'number' && activeNumber) onConfirmClue('number', activeNumber);
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('hanabi.give_clue_modal_title', { name: targetPlayerName })}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-surface border border-line-strong rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg p-5 md:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto flex flex-col gap-4"
      >
        <div className="flex justify-between items-center gap-3">
          <h2 className="font-display font-bold text-xl text-ink">{t('hanabi.give_clue_modal_title', { name: targetPlayerName })}</h2>
          <button type="button" onClick={onClose} className="icon-btn border-transparent" aria-label={t('game.close')}>
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-body">
          {t('hanabi.give_clue_modal_desc')}
          {isWildMode && <span className="block mt-1 text-accent">{t('hanabi.give_clue_modal_wild_desc')}</span>}
        </p>

        <div className="flex gap-2 justify-center p-3 bg-ground rounded-2xl border border-line overflow-x-auto">
          {targetCards.map((card, i) => {
            const isMatch =
              (selectedType === 'color' && (card.color === activeColor || (isWildMode && card.color === 'multicolor'))) ||
              (selectedType === 'number' && card.number === activeNumber);
            return (
              <div key={card.id || i} className={`transition-all duration-200 ${isMatch ? '-translate-y-1' : 'opacity-35'}`}>
                <TeammateCard card={card} isHighlighted={isMatch} />
              </div>
            );
          })}
        </div>

        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          {(['color', 'number'] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={selectedType === type}
              onClick={() => {
                setSelectedType(type);
                setSelectedValue(type === 'color' ? availableColors[0] || '' : availableNumbers[0] || 0);
              }}
              className={`btn ${selectedType === type ? 'btn-primary' : 'btn-secondary'}`}
            >
              {type === 'color' ? t('hanabi.clue_type_color') : t('hanabi.clue_type_number')}
            </button>
          ))}
        </div>

        {selectedType === 'color' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableColors.map((col) => {
              const conf = COLOR_CONFIG[col] || COLOR_CONFIG.white;
              const isSelected = activeColor === col;
              return (
                <button
                  key={col}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedValue(col)}
                  className={`min-h-11 px-3 rounded-xl font-bold text-sm border-2 cursor-pointer ${conf.bg} ${conf.ink} ${
                    isSelected ? 'border-white ring-2 ring-accent' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  {getColorName(col, t)}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex gap-2 justify-center">
            {availableNumbers.map((num) => (
              <button
                key={num}
                type="button"
                aria-pressed={activeNumber === num}
                onClick={() => setSelectedValue(num)}
                className={`w-12 h-12 rounded-xl font-display font-bold text-lg border-2 cursor-pointer ${
                  activeNumber === num ? 'bg-accent text-accent-ink border-white' : 'bg-raised text-ink border-line-strong hover:border-accent-line'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-secondary sm:flex-1">
            {t('common.cancel')}
          </button>
          <button type="button" onClick={handleConfirm} className="btn btn-primary sm:flex-1">
            <Lightbulb size={18} />
            {t('hanabi.confirm_clue_btn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

type SideTab = 'players' | 'rules' | 'log' | 'discard';

export function HanabiGameRoom() {
  const { t, i18n } = useTranslation();
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
    soundEnabled,
    toggleSound,
    sendMessage,
  } = useHanabiStore();

  const [clueModalTarget, setClueModalTarget] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>('players');
  const [sideOpen, setSideOpen] = useState(false);
  const [burstTrigger, setBurstTrigger] = useState<{ color: string; isBonus?: boolean; timestamp: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [playToast, setPlayToast] = useState<{ type: 'success' | 'error'; message: string; submessage?: string } | null>(null);

  // Resultados de jogadas disparam partículas, tremor e aviso
  useEffect(() => {
    if (!lastPlayResult) return;
    const colorName = getColorName(lastPlayResult.color, t);

    if (lastPlayResult.success) {
      setBurstTrigger({ color: lastPlayResult.color, isBonus: lastPlayResult.isFiveBonus, timestamp: lastPlayResult.timestamp });
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
      setPlayToast({
        type: 'error',
        message: t('hanabi.toast_explosion', { user: lastPlayResult.userName }),
        submessage: t('hanabi.toast_explosion_sub', { color: colorName, number: lastPlayResult.number, fuses: lastPlayResult.fuseTokens }),
      });
    }

    const timer = setTimeout(() => setPlayToast(null), 4500);
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

  // Idioma das mensagens do servidor acompanha o da interface (só muda no lobby)
  useEffect(() => {
    if (gameState?.state === 'LOBBY') {
      const lang = i18n.language?.startsWith('pt') ? 'pt' : 'en';
      if (gameState.language !== lang) sendMessage('SET_LANGUAGE', { language: lang });
    }
  }, [i18n.language, gameState?.state, gameState?.language, sendMessage]);

  // Seleção some quando o turno muda
  useEffect(() => {
    setSelectedCardId(null);
  }, [gameState?.currentPlayer]);

  if (!gameState) {
    return (
      <GameLoading
        accent="sky"
        message={!isConnected && !isReconnecting ? t('hanabi.entering_hanabi', { roomId }) : isReconnecting ? t('common.reconnecting', { attempt: reconnectAttempt }) : t('hanabi.loading_show_data')}
        onRetry={isReconnecting ? manualReconnect : undefined}
      />
    );
  }

  const myId = session?.user?.id || '';
  const isLeader = gameState.players[0] === myId;
  const isLobby = gameState.state === 'LOBBY';
  const isMyTurn = gameState.state === 'PLAYING' && gameState.currentPlayer === myId;
  const canDiscard = gameState.clockTokens < 8;
  const myCards = gameState.hands[myId] || [];
  const otherPlayers = gameState.players.filter((p) => p !== myId);
  const activeMode = gameState.gameMode || 'classic';
  const isWildMode = activeMode === 'rainbow_wild';
  const activeFireworksColors = Object.keys(gameState.fireworks || {});
  const totalPlayers = gameState.players.length;
  const nameOf = (pid: string) => gameState.playerNames?.[pid] || pid.substring(0, 6);
  const score = Object.values(gameState.fireworks).reduce((a, b) => a + b, 0);
  const selectedIndex = myCards.findIndex((c) => c.id === selectedCardId);

  const openSide = (tab: SideTab) => {
    setSideTab(tab);
    setSideOpen(true);
  };

  const lobbyPlayers: LobbyPlayer[] = gameState.players.map((pid) => ({
    id: pid,
    name: nameOf(pid),
    isMe: pid === myId,
    isHost: gameState.players[0] === pid,
    isOnline: gameState.playerConnected?.[pid] !== false,
    isReady: Boolean(gameState.playerReady?.[pid]),
  }));
  const readyCount = lobbyPlayers.filter((p) => p.isReady).length;

  let status: React.ReactNode = null;
  if (isLobby) {
    status = <StatusPill tone="wait" title={t('status.waiting_room')} detail={t('lobby.ready_count', { ready: readyCount, total: totalPlayers })} />;
  } else if (gameState.state === 'PLAYING') {
    status = isMyTurn ? (
      <StatusPill tone="turn" title={t('status.your_turn')} detail={t('hanabi.status_your_turn_detail')} />
    ) : (
      <StatusPill tone="wait" title={t('status.turn_of', { name: nameOf(gameState.currentPlayer) })} />
    );
  }

  const stats =
    gameState.state === 'PLAYING' ? (
      <>
        <span className="chip shrink-0" title={t('hanabi.clue_tokens')}>
          <Lightbulb size={14} className="text-sky-300" aria-hidden="true" />
          <span className="sr-only">{t('hanabi.clue_tokens')}:</span>
          {gameState.clockTokens}/8
        </span>
        <span className={`chip shrink-0 ${gameState.fuseTokens > 0 ? 'chip-danger' : ''}`} title={t('hanabi.fuse_tokens')}>
          <Flame size={14} aria-hidden="true" />
          <span className="sr-only">{t('hanabi.fuse_tokens')}:</span>
          {gameState.fuseTokens}/3
        </span>
        <span className="chip shrink-0" title={t('hanabi.deck')}>
          <Layers size={14} aria-hidden="true" />
          <span className="sr-only">{t('hanabi.deck')}:</span>
          {gameState.deckCount}
        </span>
      </>
    ) : null;

  const sideTabs: TabOption[] = [
    { id: 'players', label: t('game.players_count', { count: totalPlayers }), icon: <Users size={16} /> },
    { id: 'log', label: t('game.history'), icon: <HistoryIcon size={16} /> },
    { id: 'discard', label: `${t('hanabi.discard')} (${gameState.discardPile.length})`, icon: <Trash2 size={16} /> },
    { id: 'rules', label: t('game.rules'), icon: <BookOpen size={16} /> },
  ];

  let sideContent: React.ReactNode;
  if (sideTab === 'players') {
    sideContent = (
      <div className="space-y-2">
        {gameState.players.map((pid) => {
          const isCurrent = gameState.currentPlayer === pid && gameState.state === 'PLAYING';
          return (
            <PlayerRow
              key={pid}
              id={pid}
              name={nameOf(pid)}
              isMe={pid === myId}
              isHost={gameState.players[0] === pid}
              isOnline={gameState.playerConnected?.[pid] !== false}
              highlight={isCurrent}
              subtitle={isCurrent ? t('hanabi.turn_tag') : t('lobby.online')}
              right={
                isLobby ? (
                  gameState.playerReady?.[pid] ? <span className="chip chip-success">{t('lobby.ready')}</span> : <span className="chip chip-warning">{t('lobby.waiting')}</span>
                ) : (
                  <span className="text-sm text-muted">{t('hanabi.cards_count', { count: gameState.hands[pid]?.length || 0 })}</span>
                )
              }
            />
          );
        })}
      </div>
    );
  } else if (sideTab === 'log') {
    sideContent = gameState.actionLog.length ? (
      <ul className="space-y-2">
        {gameState.actionLog
          .slice()
          .reverse()
          .map((entry, idx) => (
            <li key={idx} className="text-sm text-body p-3 rounded-xl bg-surface border border-line">
              {entry}
            </li>
          ))}
      </ul>
    ) : (
      <EmptyState>{t('game.no_history')}</EmptyState>
    );
  } else if (sideTab === 'discard') {
    sideContent = (
      <div className="space-y-3">
        <p className="text-sm text-body">{t('hanabi.discarded_modal_desc')}</p>
        {activeFireworksColors.map((color) => {
          const conf = COLOR_CONFIG[color] || COLOR_CONFIG.white;
          const numbers = gameState.discardPile
            .filter((c) => c.color === color)
            .map((c) => c.number)
            .sort((a, b) => a - b);
          return (
            <div key={color} className="p-3 rounded-2xl bg-surface border border-line flex items-center gap-3">
              <span className={`min-w-24 text-center px-2 py-1 rounded-lg text-xs font-bold uppercase ${conf.bg} ${conf.ink}`}>
                {getColorName(color, t)}
              </span>
              <div className="flex gap-1.5 flex-wrap justify-end flex-1">
                {numbers.length === 0 ? (
                  <span className="text-sm text-muted">{t('hanabi.none_discarded')}</span>
                ) : (
                  numbers.map((n, i) => (
                    <span key={i} className="w-8 h-8 rounded-lg bg-raised border border-line-strong font-bold text-sm text-ink flex items-center justify-center">
                      {n}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    sideContent = (
      <RulesList
        items={[
          { title: t('hanabi.rule1_title'), body: t('hanabi.rule1_body') },
          { title: t('hanabi.rule2_title'), body: t('hanabi.rule2_body') },
          { title: t('hanabi.rule3_title'), body: t('hanabi.rule3_body') },
          { title: t('hanabi.rule4_title'), body: t('hanabi.rule4_body') },
        ]}
      />
    );
  }

  return (
    <GameShell
      accent="sky"
      phaseKey={isLobby ? 'lobby' : 'play'}
      showRail={!isLobby}
      side={{
        title: 'Hanabi',
        tabs: sideTabs,
        activeTab: sideTab,
        onTabChange: (id) => setSideTab(id as SideTab),
        content: sideContent,
      }}
      sideOpen={sideOpen}
      onSideClose={() => setSideOpen(false)}
      header={
        <GameHeader
          gameTitle="Hanabi"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => {
            disconnect();
            navigate('/hub');
          }}
          onTogglePlayers={() => openSide('players')}
          onToggleRules={() => openSide('rules')}
          onToggleLog={() => openSide('log')}
          railVisible={!isLobby}
          status={status}
          stats={stats}
        />
      }
      notices={
        <AnimatePresence>
          <ConnectionNotices
            key="conn"
            isReconnecting={isReconnecting}
            reconnectAttempt={reconnectAttempt}
            onReconnect={manualReconnect}
            disconnectedName={disconnectNotice?.userName}
          />
          {playToast && (
            <GameNotice key="play" tone={playToast.type === 'success' ? 'success' : 'error'} title={playToast.message} detail={playToast.submessage} onClose={() => setPlayToast(null)} />
          )}
          {errorMsg && <GameNotice key="err" tone="error" title={errorMsg} onClose={clearError} />}
        </AnimatePresence>
      }
      footer={
        gameState.state === 'PLAYING' ? (
          <div className={`w-full border-t px-3 md:px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] ${isMyTurn ? 'bg-surface border-accent-line' : 'bg-surface border-line'}`}>
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end gap-3 md:gap-6">
              <div className="flex-1 min-w-0 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="label-caps" style={isMyTurn ? { color: 'var(--accent)' } : undefined}>
                  {isMyTurn ? t('hanabi.my_hand_turn') : t('hanabi.my_hand')}
                </span>
                <span className="text-xs text-muted text-right">{isMyTurn ? t('hanabi.tap_card') : t('hanabi.my_hand_note')}</span>
              </div>

              <div className="flex gap-2 md:gap-3 justify-center">
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
                      selectable={isMyTurn}
                      isSelected={selectedCardId === card.id}
                      isHighlighted={isHinted}
                      onSelect={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                    />
                  );
                })}
              </div>
              </div>

              {isMyTurn && (
                <div className="grid grid-cols-2 md:grid-cols-1 md:w-56 gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!selectedCardId}
                    onClick={() => {
                      if (!selectedCardId) return;
                      playCard(selectedCardId);
                      setSelectedCardId(null);
                    }}
                    className="btn btn-primary btn-lg"
                  >
                    <Play size={18} fill="currentColor" />
                    {selectedCardId ? t('hanabi.play_card_n', { n: selectedIndex + 1 }) : t('hanabi.play_card')}
                  </button>
                  <button
                    type="button"
                    disabled={!selectedCardId || !canDiscard}
                    title={!canDiscard ? t('hanabi.discard_card_disabled_tooltip') : t('hanabi.discard_card_tooltip')}
                    onClick={() => {
                      if (!selectedCardId) return;
                      discardCard(selectedCardId);
                      setSelectedCardId(null);
                    }}
                    className="btn btn-secondary btn-lg"
                  >
                    <Trash2 size={18} />
                    {t('hanabi.discard_card')}
                  </button>
                  {!canDiscard && <p className="col-span-2 md:col-span-1 text-xs text-amber-300 text-center">{t('hanabi.discard_card_disabled_tooltip')}</p>}
                </div>
              )}
            </div>
          </div>
        ) : null
      }
      overlay={
        <>
          <FireworksCanvas burst={burstTrigger} isVictory={Boolean(gameState.state === 'GAME_OVER' && gameState.gameResult?.win)} />

          <AnimatePresence>
            {clueModalTarget && (
              <GiveClueModal
                key="clue"
                targetPlayerName={nameOf(clueModalTarget)}
                targetCards={gameState.hands[clueModalTarget] || []}
                isWildMode={isWildMode}
                onClose={() => setClueModalTarget(null)}
                onConfirmClue={(type, val) => giveClue(clueModalTarget, type, val)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {gameState.state === 'GAME_OVER' && gameState.gameResult && (
              <ResultModal
                key="over"
                tone={gameState.gameResult.win ? 'win' : 'lose'}
                icon={gameState.gameResult.win ? <Sparkles size={32} /> : <Flame size={32} />}
                eyebrow={t('hanabi.final_score')}
                title={gameState.gameResult.win ? t('hanabi.game_over_win_title') : t('hanabi.game_over_loss_title')}
                actions={
                  <>
                    <button type="button" onClick={() => navigate('/hub')} className="btn btn-secondary btn-lg sm:flex-1">
                      <Home size={18} />
                      {t('common.back_to_hub')}
                    </button>
                    <button type="button" onClick={restartGame} className="btn btn-primary btn-lg sm:flex-1">
                      <RotateCcw size={18} />
                      {t('common.play_again')}
                    </button>
                  </>
                }
              >
                <p className="font-display font-bold text-5xl text-accent">
                  {gameState.gameResult.score}
                  <span className="text-2xl text-muted"> / {gameState.maxScore || 25}</span>
                </p>
                <p className="text-body">{gameState.gameResult.message}</p>
                <blockquote className="w-full p-4 rounded-2xl bg-raised text-left">
                  <span className="label-caps block mb-1">{t('hanabi.guild_verdict')}</span>
                  <p className="text-ink font-semibold">“{gameState.gameResult.rating}”</p>
                </blockquote>
              </ResultModal>
            )}
          </AnimatePresence>
        </>
      }
    >
      {isLobby && (
        <GameLobby
          description={t('hanabi.lobby_desc')}
          players={lobbyPlayers}
          minPlayers={2}
          maxPlayers={5}
          isHost={isLeader}
          isReadyMe={Boolean(gameState.playerReady?.[myId])}
          onToggleReady={toggleReady}
          onStart={startGame}
          startBlockedReason={lobbyBlockReason(t, lobbyPlayers, 2)}
          howTo={[t('hanabi.howto_1'), t('hanabi.howto_2'), t('hanabi.howto_3')]}
          settings={
            <div className="flex flex-col gap-3">
              <div role="radiogroup" aria-label={t('hanabi.rules_variants_title')} className="grid grid-cols-1 gap-2">
                {GAME_MODES.map((m) => {
                  const isSelected = activeMode === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!isLeader}
                      onClick={() => isLeader && setGameOptions(m.id, gameState.perfectShow ?? false)}
                      className={`p-3 rounded-xl border-2 text-left flex gap-3 items-start transition-colors ${
                        isSelected ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                      } ${isLeader ? 'cursor-pointer' : 'cursor-default'} disabled:opacity-100`}
                    >
                      <Icon size={20} className={isSelected ? 'text-accent mt-0.5' : 'text-muted mt-0.5'} aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-sm text-ink">{t(`hanabi.modes.${m.id}.name`)}</span>
                        <span className="block text-xs text-muted mt-0.5">{t(`hanabi.modes.${m.id}.subtitle`)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className={`flex items-start gap-3 p-3 rounded-xl border-2 ${gameState.perfectShow ? 'border-amber-500 bg-amber-950/40' : 'border-line'} ${isLeader ? 'cursor-pointer' : ''}`}>
                <Trophy size={20} className="text-amber-300 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block font-bold text-sm text-ink">{t('hanabi.modifier_perfect_show_title')}</span>
                  <span className="block text-xs text-muted mt-0.5">{t('hanabi.modifier_perfect_show_desc')}</span>
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(gameState.perfectShow)}
                  disabled={!isLeader}
                  onChange={() => setGameOptions(activeMode, !(gameState.perfectShow ?? false))}
                  className="w-5 h-5 mt-0.5 accent-amber-400 cursor-pointer"
                />
              </label>
            </div>
          }
        />
      )}

      {gameState.state !== 'LOBBY' && (
        <div className="w-full h-full max-w-6xl flex flex-col gap-3 md:gap-5 min-h-0">
          {/* Mãos dos parceiros: linhas no celular, painéis no desktop */}
          <section aria-label={t('hanabi.teammates')} className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 overflow-y-auto max-h-[62%] md:max-h-none">
            {otherPlayers.map((pid) => {
              const isCurrent = pid === gameState.currentPlayer;
              const canClue = isMyTurn && gameState.clockTokens > 0;
              return (
                <div
                  key={pid}
                  className={`flex md:flex-col lg:flex-row items-center md:items-stretch lg:items-center gap-2 md:gap-3 lg:gap-4 p-1.5 pl-3 md:p-4 rounded-2xl border ${
                    isCurrent ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex lg:flex-col items-center lg:items-start justify-between lg:justify-center gap-2 w-16 md:w-auto lg:w-32 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm md:text-base text-ink truncate">{nameOf(pid)}</span>
                      {isCurrent && <span className="hidden md:inline-flex chip chip-accent">{t('hanabi.turn_tag')}</span>}
                    </div>
                    {canClue && (
                      <button type="button" onClick={() => setClueModalTarget(pid)} className="hidden md:inline-flex btn btn-primary btn-sm">
                        <Lightbulb size={16} />
                        {t('hanabi.give_clue')}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex gap-1 md:gap-2 md:justify-center lg:justify-end min-w-0">
                    {(gameState.hands[pid] || []).map((c) => {
                      const isHinted =
                        gameState.lastAction?.type === 'CLUE' && gameState.lastAction.targetPlayerId === pid && gameState.lastAction.targetCardIds?.includes(c.id);
                      return <TeammateCard key={c.id} card={c} isHighlighted={isHinted} />;
                    })}
                  </div>
                  {canClue && (
                    <button type="button" onClick={() => setClueModalTarget(pid)} className="md:hidden btn btn-primary btn-sm shrink-0" aria-label={t('hanabi.give_clue_to', { name: nameOf(pid) })}>
                      {t('hanabi.clue_short')}
                    </button>
                  )}
                </div>
              );
            })}
          </section>

          {/* Mesa de fogos */}
          <motion.section
            aria-label={t('hanabi.fireworks_table')}
            animate={isShaking ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex-1 min-h-0 flex flex-col justify-center items-center gap-2 md:gap-3"
          >
            <div className="flex items-center justify-between w-full max-w-3xl">
              <span className="label-caps">{t('hanabi.fireworks_table')}</span>
              <span className="text-sm text-body">
                <Flame size={14} className="inline text-amber-300 mr-1" aria-hidden="true" />
                {t('hanabi.score_label')}: <strong className="text-ink">{score}</strong>/{gameState.maxScore || 25}
              </span>
            </div>
            <div className="w-full max-w-3xl flex gap-2 md:gap-4 justify-center">
              {Object.entries(gameState.fireworks).map(([color, value]) => {
                const conf = COLOR_CONFIG[color] || COLOR_CONFIG.white;
                const isRecent = lastPlayResult?.success && lastPlayResult?.color === color;
                return (
                  <motion.div
                    key={color}
                    animate={isRecent ? { scale: [1, 1.12, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    role="img"
                    aria-label={`${getColorName(color, t)}: ${value}/5`}
                    className={`flex-1 max-w-28 aspect-[2/3] max-h-[min(30dvh,190px)] rounded-xl md:rounded-2xl border-2 flex flex-col items-center justify-between p-1.5 md:p-2 ${
                      value > 0 ? `${conf.bg} ${conf.border} ${conf.ink}` : 'bg-ground border-dashed border-line-strong text-muted'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase leading-none">{getColorShort(color, t)}</span>
                    <span className="font-display font-bold text-3xl md:text-5xl leading-none">{value > 0 ? value : '–'}</span>
                    <span className="text-xs font-bold leading-none">{value === 5 ? '★' : `${value}/5`}</span>
                  </motion.div>
                );
              })}
            </div>
            {gameState.actionLog.length > 0 && (
              <button type="button" onClick={() => openSide('log')} className="min-h-10 inline-flex items-center text-sm text-muted hover:text-ink underline underline-offset-4 truncate max-w-full cursor-pointer xl:no-underline xl:cursor-default xl:pointer-events-none">
                {gameState.actionLog[gameState.actionLog.length - 1]}
              </button>
            )}
          </motion.section>
        </div>
      )}
    </GameShell>
  );
}
