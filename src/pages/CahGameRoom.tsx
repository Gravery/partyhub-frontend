import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCahStore, type CahWhiteCard, type AnonymousSubmission } from '../store/useCahStore';
import { cahAudio } from '../lib/audioEngine';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '../components/game/ui';
import { Users, BookOpen, Sparkles, Crown, Check, Send, RefreshCw, ArrowRight, Eye, Home, RotateCcw, Trash2 } from 'lucide-react';
import { CustomThemeModal } from '../components/game/CustomThemeModal';

const CARD_SIZE = 'w-[clamp(118px,11vw,176px)] aspect-[2/3]';

/** Carta preta com pré-visualização das respostas nos espaços em branco. */
function BlackCardView({ text, pick = 1, previewTexts }: { text?: string | null; pick?: number; previewTexts?: (string | null | undefined)[] }) {
  const { t } = useTranslation();
  const safeText = text || '';
  const validPreviews = (previewTexts?.filter(Boolean) as string[]) || [];
  const fill = (answer?: string | null) =>
    answer ? (
      <span className="bg-amber-300 text-slate-950 font-extrabold px-1.5 rounded mx-1">{answer}</span>
    ) : (
      <span className="inline-block min-w-16 border-b-2 border-dashed border-white/60 mx-1 align-baseline">&nbsp;</span>
    );

  let content: React.ReactNode;
  if (safeText.includes('____')) {
    const parts = safeText.split('____');
    content = parts.map((part, idx) => (
      <span key={idx}>
        {part}
        {idx < parts.length - 1 && fill(previewTexts?.[idx])}
      </span>
    ));
  } else {
    const slots = Math.max(pick, validPreviews.length);
    content = (
      <>
        {safeText}
        {(validPreviews.length > 0 || pick > 1) && (
          <span className="block mt-3 space-y-1.5">
            {Array.from({ length: slots }).map((_, idx) => (
              <span key={idx} className="block">
                {slots > 1 && <span className="text-white/60 mr-1">{idx + 1}.</span>}
                {fill(previewTexts?.[idx])}
              </span>
            ))}
          </span>
        )}
      </>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-black border border-white/25 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-3 max-h-[30dvh] md:max-h-none overflow-y-auto">
      <p className="font-display font-bold text-lg md:text-2xl xl:text-3xl text-white leading-snug">{content}</p>
      <div className="flex justify-between items-center pt-2 border-t border-white/15 text-xs font-bold uppercase tracking-wider text-white/60">
        <span>{t('cah.game_title')}</span>
        <span className={pick > 1 ? 'chip bg-amber-300 text-slate-950' : 'text-amber-300'}>
          {pick > 1 ? t('cah.pick_multi', { count: pick }) : t('cah.pick_one')}
        </span>
      </div>
    </div>
  );
}

/** Carta branca: na mão (selecionável) ou na mesa. */
function WhiteCardView({
  card,
  isSelected,
  selectionBadge,
  isWinner,
  authorName,
  onClick,
  onHover,
  disabled,
}: {
  card?: CahWhiteCard | null;
  isSelected?: boolean;
  selectionBadge?: React.ReactNode;
  isWinner?: boolean;
  authorName?: string;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (!card) return null;
  const interactive = Boolean(onClick) && !disabled;

  return (
    <motion.button
      type="button"
      disabled={!interactive}
      aria-pressed={interactive ? Boolean(isSelected) : undefined}
      whileHover={interactive ? { y: -6 } : {}}
      whileTap={interactive ? { scale: 0.98 } : {}}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      onClick={interactive ? onClick : undefined}
      className={`relative ${CARD_SIZE} rounded-2xl p-3 flex flex-col justify-between text-left select-none border-2 shrink-0 transition-colors ${
        isWinner
          ? 'bg-amber-300 text-slate-950 border-white ring-4 ring-amber-300/40'
          : isSelected
          ? 'bg-white text-slate-950 border-accent ring-4 ring-white/30 -translate-y-2'
          : 'bg-white text-slate-950 border-zinc-200'
      } ${interactive ? 'cursor-pointer hover:border-zinc-400' : 'cursor-default'} ${disabled && !isWinner && onClick ? 'opacity-60' : ''}`}
    >
      <span className="font-bold text-sm xl:text-base leading-snug overflow-y-auto break-words">{card.text || ''}</span>
      <span className="flex justify-between items-end gap-1 pt-2 border-t border-zinc-200 text-xs font-bold text-zinc-500">
        <span>PartyHub</span>
        {authorName && <span className="px-1.5 py-0.5 bg-black text-white rounded truncate max-w-[60%]">{authorName}</span>}
      </span>
      {selectionBadge && (
        <span className="absolute -top-2.5 -left-2.5 min-w-7 h-7 px-1.5 rounded-full bg-zinc-900 text-white border-2 border-white text-xs font-bold flex items-center justify-center">
          {selectionBadge}
        </span>
      )}
      {isWinner && (
        <span className="absolute -top-3 -right-2 chip bg-zinc-900 text-amber-300 border border-amber-300">
          <Crown size={12} />
          {t('cah.card_winner_badge')}
        </span>
      )}
    </motion.button>
  );
}

/** Carta da mesa que o Czar vira uma a uma. */
function FlippableCard({
  card,
  isRevealed,
  cardsCount = 1,
  cardIndex = 0,
  canReveal,
  canSelect,
  isSelected,
  onCardClick,
  onHover,
}: {
  card?: CahWhiteCard | null;
  isRevealed: boolean;
  cardsCount?: number;
  cardIndex?: number;
  canReveal: boolean;
  canSelect: boolean;
  isSelected: boolean;
  onCardClick: () => void;
  onHover?: (hovering: boolean) => void;
}) {
  const { t } = useTranslation();
  const interactive = canReveal || canSelect;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onCardClick}
      aria-pressed={canSelect ? isSelected : undefined}
      aria-label={isRevealed ? card?.text || '' : t('cah.hidden_card')}
      style={{ perspective: 1000 }}
      className={`relative ${CARD_SIZE} select-none shrink-0 rounded-2xl ${interactive ? 'cursor-pointer' : 'cursor-default'} ${
        isSelected ? 'ring-4 ring-accent ring-offset-2 ring-offset-ground' : ''
      }`}
      onMouseEnter={() => isRevealed && onHover?.(true)}
      onMouseLeave={() => isRevealed && onHover?.(false)}
    >
      <motion.span
        animate={{ rotateY: isRevealed ? 0 : 180 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className="block w-full h-full relative"
      >
        <span
          style={{ backfaceVisibility: 'hidden' }}
          className="absolute inset-0 rounded-2xl p-3 flex flex-col justify-between text-left border-2 bg-white text-slate-950 border-zinc-200"
        >
          <span className="font-bold text-sm xl:text-base leading-snug overflow-y-auto break-words">{card?.text || ''}</span>
          <span className="flex justify-between items-end pt-2 border-t border-zinc-200 text-xs font-bold text-zinc-500">
            <span>PartyHub</span>
            {cardsCount > 1 && <span>{cardIndex + 1}/{cardsCount}</span>}
          </span>
        </span>
        <span
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          className={`absolute inset-0 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 border-2 bg-zinc-900 text-white ${
            canReveal ? 'border-accent-line hover:border-accent' : 'border-zinc-700'
          }`}
        >
          <span className="font-display font-bold text-sm tracking-widest text-zinc-300 uppercase">PartyHub</span>
          {canReveal && (
            <span className="chip chip-accent">
              <Eye size={14} />
              {t('cah.reveal')}
            </span>
          )}
        </span>
      </motion.span>
    </button>
  );
}

type SideTab = 'players' | 'rules';

export function CahGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { session } = useAuthStore();

  const {
    gameState,
    isReconnecting,
    reconnectAttempt,
    manualReconnect,
    disconnectNotice,
    roundWinnerToast,
    errorMsg,
    clearError,
    connect,
    disconnect,
    sendMessage,
    setOptions,
    toggleReady,
    startGame,
    submitAnswer,
    revealSubmission,
    selectWinner,
    nextRound,
    restartGame,
    discardCards,
    clearWinnerToast,
    soundEnabled,
    toggleSound,
  } = useCahStore();

  const requiredPick = gameState?.currentBlackCard?.pick || 1;
  const discardsRemaining = gameState?.discardsRemaining ?? 2;

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isDiscardMode, setIsDiscardMode] = useState(false);
  const [selectedDiscardIds, setSelectedDiscardIds] = useState<string[]>([]);
  const [hoveredCardText, setHoveredCardText] = useState<string | null>(null);
  const [czarSelectedSubId, setCzarSelectedSubId] = useState<string | null>(null);
  const [czarHoveredTexts, setCzarHoveredTexts] = useState<string[] | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>('players');
  const [sideOpen, setSideOpen] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !roomId) {
      navigate('/hub');
      return;
    }
    connect(roomId, session.access_token);
    return () => disconnect();
  }, [roomId, session]);

  // Sincroniza idioma das cartas com o selecionado na interface
  useEffect(() => {
    if (gameState?.state === 'LOBBY') {
      sendMessage('SET_LANGUAGE', { language: i18n.language?.startsWith('pt') ? 'pt' : 'en' });
    }
  }, [i18n.language, gameState?.state]);

  useEffect(() => {
    setSelectedCardIds([]);
    setIsDiscardMode(false);
    setSelectedDiscardIds([]);
    setHoveredCardText(null);
    setCzarSelectedSubId(null);
    setCzarHoveredTexts(null);
    clearWinnerToast();
    if (gameState?.state === 'ROUND_REVEAL') setShowWinnerModal(true);
  }, [gameState?.roundNumber, gameState?.state]);

  const handleCardClick = (cardId: string) => {
    cahAudio.playCardSelect();
    if (isDiscardMode) {
      if (selectedDiscardIds.includes(cardId)) setSelectedDiscardIds(selectedDiscardIds.filter((id) => id !== cardId));
      else if (selectedDiscardIds.length < discardsRemaining) setSelectedDiscardIds([...selectedDiscardIds, cardId]);
      return;
    }
    if (selectedCardIds.includes(cardId)) {
      setSelectedCardIds(selectedCardIds.filter((id) => id !== cardId));
      return;
    }
    if (requiredPick === 1) setSelectedCardIds([cardId]);
    else if (selectedCardIds.length < requiredPick) setSelectedCardIds([...selectedCardIds, cardId]);
    else setSelectedCardIds([...selectedCardIds.slice(0, requiredPick - 1), cardId]);
  };

  if (!gameState) {
    return (
      <GameLoading
        accent="zinc"
        message={isReconnecting ? t('common.reconnecting', { attempt: reconnectAttempt }) : t('cah.loading_table')}
        onRetry={isReconnecting ? manualReconnect : undefined}
      />
    );
  }

  const myId = session?.user?.id || '';
  const isLeader = gameState.players[0] === myId;
  const isLobby = gameState.state === 'LOBBY';
  const isPlaying = !isLobby && gameState.state !== 'GAME_OVER';
  const isCzar = gameState.isCzar;
  const myHand = gameState.myHand || [];
  const totalPlayers = gameState.players.length;
  const nameOf = (pid: string) => gameState.playerNames?.[pid] || pid.substring(0, 6);
  const allRevealed = !!gameState.allSubmissionsRevealed;

  const openSide = (tab: SideTab) => {
    setSideTab(tab);
    setSideOpen(true);
  };

  // Texto que aparece nos espaços da carta preta
  let activePreviewTexts: (string | null | undefined)[] = [];
  if (gameState.state === 'ROUND_REVEAL') {
    if (gameState.roundWinner?.cards?.length) activePreviewTexts = gameState.roundWinner.cards.map((c) => c.text);
    else if (roundWinnerToast?.cards?.length) activePreviewTexts = roundWinnerToast.cards.map((c) => c.text);
    else if (gameState.roundWinner?.card?.text) activePreviewTexts = [gameState.roundWinner.card.text];
  } else if (gameState.state === 'JUDGING') {
    if (czarHoveredTexts?.length) activePreviewTexts = czarHoveredTexts;
    else if (czarSelectedSubId) {
      const selectedSub = gameState.anonymousSubmissions?.find(
        (s) => s.submissionId === czarSelectedSubId || (s.cards && s.cards[0]?.id === czarSelectedSubId)
      );
      if (selectedSub?.cards) activePreviewTexts = selectedSub.cards.map((c) => c.text);
    }
  } else if (gameState.state === 'SELECTING_ANSWERS') {
    const selectedTexts = selectedCardIds.map((id) => myHand.find((c) => c.id === id)?.text).filter(Boolean) as string[];
    activePreviewTexts =
      hoveredCardText && !selectedTexts.includes(hoveredCardText) && selectedTexts.length < requiredPick
        ? [...selectedTexts, hoveredCardText]
        : selectedTexts;
  }

  const lobbyPlayers: LobbyPlayer[] = gameState.players.map((pid) => ({
    id: pid,
    name: nameOf(pid),
    isMe: pid === myId,
    isHost: gameState.players[0] === pid,
    isOnline: gameState.playerConnected?.[pid] !== false,
    isReady: Boolean(gameState.playerReady?.[pid]),
  }));
  const readyCount = lobbyPlayers.filter((p) => p.isReady).length;
  const progress = t('cah.answers_progress', { current: gameState.submissionsCount, total: gameState.totalExpectedSubmissions });

  let status: React.ReactNode = null;
  if (isLobby) {
    status = <StatusPill tone="wait" title={t('status.waiting_room')} detail={t('lobby.ready_count', { ready: readyCount, total: totalPlayers })} />;
  } else if (gameState.state === 'SELECTING_ANSWERS') {
    status = isCzar ? (
      <StatusPill tone="wait" title={t('cah.status_you_czar')} detail={progress} />
    ) : gameState.hasSubmitted ? (
      <StatusPill tone="wait" title={t('cah.status_sent')} detail={progress} />
    ) : (
      <StatusPill tone="turn" title={t('status.your_turn')} detail={requiredPick > 1 ? t('cah.status_pick_n', { count: requiredPick }) : t('cah.status_pick_one')} />
    );
  } else if (gameState.state === 'JUDGING') {
    status = isCzar ? (
      <StatusPill tone="turn" title={t('cah.status_you_czar')} detail={allRevealed ? t('cah.status_choose_winner') : t('cah.status_reveal')} />
    ) : (
      <StatusPill tone="wait" title={t('cah.status_judging', { name: gameState.czarName || '' })} />
    );
  } else if (gameState.state === 'ROUND_REVEAL' && gameState.roundWinner) {
    status = <StatusPill tone="success" title={t('cah.round_winner_title', { name: gameState.roundWinner.playerName })} />;
  }

  const stats = isPlaying ? (
    <>
      <span className="chip shrink-0">
        <Crown size={14} className="text-amber-300" aria-hidden="true" />
        {gameState.czarName || '…'}
      </span>
      <span className="chip shrink-0 hidden sm:inline-flex">{t('cah.goal_chip', { score: gameState.scoreToWin })}</span>
    </>
  ) : null;

  const ranking = [...gameState.players].sort((a, b) => (gameState.scores?.[b] || 0) - (gameState.scores?.[a] || 0));

  const sideTabs: TabOption[] = [
    { id: 'players', label: t('cah.scoreboard_tab', { count: totalPlayers }), icon: <Users size={16} /> },
    { id: 'rules', label: t('game.rules'), icon: <BookOpen size={16} /> },
  ];

  const sideContent =
    sideTab === 'players' ? (
      <div className="space-y-2">
        <p className="text-sm text-muted">{t('cah.goal_chip', { score: gameState.scoreToWin })}</p>
        {(isLobby ? gameState.players : ranking).map((pid) => {
          const pIsCzar = pid === gameState.czarId && isPlaying;
          const pSubmitted = gameState.submittedStatus?.[pid];
          return (
            <PlayerRow
              key={pid}
              id={pid}
              name={nameOf(pid)}
              isMe={pid === myId}
              isHost={gameState.players[0] === pid}
              isOnline={gameState.playerConnected?.[pid] !== false}
              highlight={pIsCzar}
              subtitle={
                pIsCzar
                  ? t('cah.czar')
                  : gameState.state === 'SELECTING_ANSWERS'
                  ? pSubmitted
                    ? t('cah.answered')
                    : t('cah.choosing')
                  : t('lobby.online')
              }
              right={
                isLobby ? (
                  gameState.playerReady?.[pid] ? <span className="chip chip-success">{t('lobby.ready')}</span> : <span className="chip chip-warning">{t('lobby.waiting')}</span>
                ) : (
                  <span className="font-mono font-bold text-ink">{gameState.scores?.[pid] || 0}</span>
                )
              }
            />
          );
        })}
      </div>
    ) : (
      <RulesList
        items={[
          { title: t('cah.rule1_title'), body: t('cah.rule1_body') },
          { title: t('cah.rule2_title'), body: t('cah.rule2_body') },
          { title: t('cah.rule3_title'), body: t('cah.rule3_body') },
        ]}
      />
    );

  return (
    <GameShell
      accent="zinc"
      phaseKey={isLobby ? 'lobby' : gameState.state === 'GAME_OVER' ? 'over' : 'play'}
      showRail={!isLobby}
      side={{
        title: t('cah.game_title'),
        tabs: sideTabs,
        activeTab: sideTab,
        onTabChange: (id) => setSideTab(id as SideTab),
        content: sideContent,
      }}
      sideOpen={sideOpen}
      onSideClose={() => setSideOpen(false)}
      header={
        <GameHeader
          gameTitle={t('cah.short_title')}
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => openSide('players')}
          onToggleRules={() => openSide('rules')}
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
          {errorMsg && <GameNotice key="err" tone="error" title={errorMsg} onClose={clearError} />}
        </AnimatePresence>
      }
      footer={
        gameState.state === 'SELECTING_ANSWERS' ? (
          <div className="w-full bg-surface border-t border-line px-3 md:px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="max-w-7xl mx-auto flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="label-caps">{t('cah.your_hand_label')}</span>
                  {isCzar ? (
                    <span className="chip chip-warning">{t('cah.czar_no_play')}</span>
                  ) : isDiscardMode ? (
                    <span className="chip chip-danger">{t('cah.discarding', { selected: selectedDiscardIds.length, max: discardsRemaining })}</span>
                  ) : (
                    <span className="chip">{t('cah.selected_count', { current: selectedCardIds.length, total: requiredPick })}</span>
                  )}
                </div>

                {!isCzar && !gameState.hasSubmitted && (
                  <div className="flex items-center gap-2">
                    {isDiscardMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDiscardMode(false);
                            setSelectedDiscardIds([]);
                          }}
                          className="btn btn-ghost btn-sm"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          disabled={selectedDiscardIds.length === 0}
                          onClick={() => {
                            discardCards(selectedDiscardIds);
                            setIsDiscardMode(false);
                            setSelectedDiscardIds([]);
                          }}
                          className="btn btn-danger btn-sm"
                        >
                          <Trash2 size={16} />
                          {t('cah.confirm_discard', { count: selectedDiscardIds.length })}
                        </button>
                      </>
                    ) : (
                      <>
                        {discardsRemaining > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDiscardMode(true);
                              setSelectedDiscardIds([]);
                              setSelectedCardIds([]);
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            <RefreshCw size={16} />
                            {t('cah.cycle_hand_btn', { remaining: discardsRemaining })}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={selectedCardIds.length !== requiredPick}
                          onClick={() => submitAnswer(selectedCardIds)}
                          className="btn btn-primary"
                        >
                          <Send size={18} />
                          {requiredPick > 1 ? t('cah.confirm_multi_answers', { count: requiredPick }) : t('cah.confirm_answer')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full overflow-x-auto pt-3 pb-1">
                <div className="flex gap-3 justify-start lg:justify-center min-w-max px-1">
                  {myHand.map((card) => {
                    let isSelected: boolean;
                    let badge: React.ReactNode;
                    if (isDiscardMode) {
                      isSelected = selectedDiscardIds.includes(card.id);
                      badge = isSelected ? <Trash2 size={12} /> : null;
                    } else {
                      const selIndex = selectedCardIds.indexOf(card.id);
                      isSelected = selIndex !== -1;
                      badge = isSelected ? (requiredPick > 1 ? selIndex + 1 : <Check size={14} strokeWidth={3} />) : null;
                    }
                    const disabled = isCzar || gameState.hasSubmitted;
                    return (
                      <WhiteCardView
                        key={card.id}
                        card={card}
                        isSelected={isSelected}
                        selectionBadge={badge}
                        disabled={disabled}
                        onHover={(h) => !disabled && setHoveredCardText(h ? card.text : null)}
                        onClick={() => handleCardClick(card.id)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
      overlay={
        <>
          <AnimatePresence>
            {gameState.state === 'ROUND_REVEAL' && gameState.roundWinner && showWinnerModal && (
              <ResultModal
                key="round"
                icon={<Crown size={32} />}
                eyebrow={t('cah.round_winner_badge')}
                title={gameState.roundWinner.playerName}
                actions={
                  <>
                    <button type="button" onClick={() => setShowWinnerModal(false)} className="btn btn-secondary btn-lg sm:flex-1">
                      <Eye size={18} />
                      {t('cah.view_table')}
                    </button>
                    {(isCzar || isLeader) && (
                      <button type="button" onClick={nextRound} className="btn btn-primary btn-lg sm:flex-1">
                        {t('cah.next_round')}
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </>
                }
              >
                <blockquote className="w-full p-4 rounded-2xl bg-raised text-left">
                  <span className="label-caps block mb-1">{t('cah.winning_answer')}</span>
                  <p className="text-ink font-semibold">
                    “{gameState.roundWinner.cards?.map((c) => c.text).join(' + ') || gameState.roundWinner.card?.text}”
                  </p>
                </blockquote>
                {!(isCzar || isLeader) && <p className="text-sm text-muted">{t('cah.waiting_czar_advance', { name: gameState.czarName || '' })}</p>}
              </ResultModal>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {gameState.state === 'GAME_OVER' && (
              <ResultModal
                key="over"
                tone="win"
                icon={<Crown size={32} />}
                eyebrow={t('cah.champion_title')}
                title={ranking[0] ? nameOf(ranking[0]) : ''}
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
                <ol className="w-full space-y-2 text-left">
                  {ranking.map((pid, idx) => (
                    <li key={pid} className="flex items-center gap-3 min-h-12 px-3 rounded-xl bg-raised">
                      <span className="font-display font-bold text-lg text-accent w-6">{idx + 1}º</span>
                      <span className="flex-1 font-bold text-ink truncate">{nameOf(pid)}</span>
                      <span className="font-mono text-body">{gameState.scores?.[pid] || 0}</span>
                    </li>
                  ))}
                </ol>
              </ResultModal>
            )}
          </AnimatePresence>

          <CustomThemeModal
            isOpen={showCustomModal}
            onClose={() => setShowCustomModal(false)}
            gameType="cah"
            existingCustomCount={(gameState.customBlackCount || 0) + (gameState.customWhiteCount || 0)}
            onSaveThemes={(payload) => sendMessage(payload.type, payload)}
          />
        </>
      }
    >
      {isLobby && (
        <GameLobby
          description={t('cah.lobby_desc')}
          players={lobbyPlayers}
          minPlayers={3}
          maxPlayers={12}
          isHost={isLeader}
          isReadyMe={Boolean(gameState.playerReady?.[myId])}
          onToggleReady={toggleReady}
          onStart={startGame}
          startBlockedReason={lobbyBlockReason(t, lobbyPlayers, 3)}
          howTo={[t('cah.howto_1'), t('cah.howto_2'), t('cah.howto_3')]}
          settings={
            <div className="flex flex-col gap-4">
              <fieldset>
                <legend className="text-sm font-bold text-ink mb-2">{t('cah.deck_language')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['pt', 'en'] as const).map((lang) => {
                    const active = (gameState.language || 'pt') === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        disabled={!isLeader}
                        aria-pressed={active}
                        onClick={() => sendMessage('SET_LANGUAGE', { language: lang })}
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'} disabled:opacity-100`}
                      >
                        {lang === 'pt' ? 'Português' : 'English'}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-bold text-ink mb-2">{t('cah.score_goal')}</legend>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 7, 10].map((pts) => {
                    const active = (gameState.scoreToWin || 5) === pts;
                    return (
                      <button
                        key={pts}
                        type="button"
                        disabled={!isLeader}
                        aria-pressed={active}
                        onClick={() => setOptions(pts)}
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'} disabled:opacity-100`}
                      >
                        {pts}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button type="button" onClick={() => setShowCustomModal(true)} className="btn btn-secondary btn-block justify-between">
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={18} className="text-accent" />
                  {t('cah.custom_cards')}
                </span>
                <span className="chip chip-accent">{(gameState.customBlackCount || 0) + (gameState.customWhiteCount || 0)}</span>
              </button>
            </div>
          }
        />
      )}

      {isPlaying && (
        <div className="w-full h-full max-w-7xl flex flex-col items-center gap-4 min-h-0">
          {gameState.currentBlackCard && (
            <div className="w-full flex justify-center shrink-0">
              <BlackCardView text={gameState.currentBlackCard.text} pick={requiredPick} previewTexts={activePreviewTexts} />
            </div>
          )}

          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0">
            {gameState.state === 'SELECTING_ANSWERS' && (
              <div className="text-center space-y-3">
                <span className="chip">{progress}</span>
                <div className="flex gap-1.5 justify-center" aria-hidden="true">
                  {Array.from({ length: gameState.totalExpectedSubmissions || 0 }).map((_, i) => (
                    <span key={i} className={`w-3 h-3 rounded-full ${i < gameState.submissionsCount ? 'bg-accent' : 'bg-raised'}`} />
                  ))}
                </div>
              </div>
            )}

            {(gameState.state === 'JUDGING' || gameState.state === 'ROUND_REVEAL') && (
              <div className="w-full h-full flex flex-col items-center gap-3 min-h-0">
                <div className="w-full flex-1 min-h-0 overflow-auto py-3">
                  <div className="flex flex-wrap gap-4 justify-center content-center min-h-full px-2">
                    {gameState.state === 'JUDGING' &&
                      gameState.anonymousSubmissions?.map((sub: AnonymousSubmission) => {
                        const isRevealed = !!sub.isRevealed;
                        const cardsCount = sub.cardsCount || (sub.cards && sub.cards.length > 0 ? sub.cards.length : 1);
                        const subCards =
                          sub.cards && sub.cards.length > 0
                            ? sub.cards
                            : Array.from({ length: cardsCount }, (_, i) => ({ id: `${sub.submissionId}_${i}`, text: '' }));
                        const isSelected = czarSelectedSubId === sub.submissionId;

                        const handleRevealOrSelect = () => {
                          if (!isRevealed) {
                            if (isCzar) revealSubmission(sub.submissionId);
                          } else if (allRevealed && isCzar) {
                            setCzarSelectedSubId(sub.submissionId);
                          }
                        };

                        return (
                          <div key={sub.submissionId} className="flex flex-col items-center gap-3">
                            <div className="flex gap-2">
                              {subCards.map((card, i) => (
                                <FlippableCard
                                  key={card.id || i}
                                  card={card}
                                  isRevealed={isRevealed}
                                  cardsCount={cardsCount}
                                  cardIndex={i}
                                  canReveal={isCzar && !isRevealed}
                                  canSelect={isCzar && isRevealed && allRevealed}
                                  isSelected={isSelected}
                                  onCardClick={handleRevealOrSelect}
                                  onHover={(h) => {
                                    if (isRevealed && allRevealed && sub.cards) setCzarHoveredTexts(h ? sub.cards.map((c) => c.text) : null);
                                  }}
                                />
                              ))}
                            </div>
                            {isCzar && allRevealed && isSelected && (
                              <button type="button" onClick={() => selectWinner(sub.submissionId)} className="btn btn-primary">
                                <Crown size={18} />
                                {t('cah.choose_winner')}
                              </button>
                            )}
                          </div>
                        );
                      })}

                    {gameState.state === 'ROUND_REVEAL' &&
                      gameState.allRevealedSubmissions?.map((sub, idx) => {
                        const cards = sub.cards && sub.cards.length > 0 ? sub.cards : [{ id: sub.cardId, text: sub.text }];
                        return (
                          <div key={sub.submissionId || sub.cardId || `${sub.playerId}_${idx}`} className="flex gap-2">
                            {cards.map((c, i) => (
                              <WhiteCardView
                                key={c.id || i}
                                card={c}
                                selectionBadge={cards.length > 1 ? i + 1 : undefined}
                                isWinner={sub.isWinner}
                                authorName={i === cards.length - 1 ? sub.playerName : undefined}
                              />
                            ))}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {gameState.state === 'ROUND_REVEAL' && !showWinnerModal && (isCzar || isLeader) && (
                  <button type="button" onClick={nextRound} className="btn btn-primary btn-lg shrink-0">
                    {t('cah.next_round')}
                    <ArrowRight size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </GameShell>
  );
}
