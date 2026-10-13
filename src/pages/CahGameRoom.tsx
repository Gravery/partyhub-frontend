import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCahStore, type CahWhiteCard, type AnonymousSubmission } from '../store/useCahStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { SideDrawer, type TabOption } from '../components/game/SideDrawer';
import { Users, BookOpen, History as HistoryIcon } from 'lucide-react';

// Renderiza a Carta Preta com suporte para "Escolha 1" ou "Escolha 2" e pré-visualização dinâmica
function BlackCardView({
  text,
  pick = 1,
  previewTexts,
}: {
  text?: string | null;
  pick?: number;
  previewTexts?: (string | null | undefined)[];
}) {
  const { t } = useTranslation();
  let content: React.ReactNode;
  const safeText = text || '';
  const validPreviews = (previewTexts?.filter(Boolean) as string[]) || [];

  if (safeText.includes('____')) {
    const parts = safeText.split('____');
    content = (
      <span>
        {parts.map((part, idx) => {
          if (idx === parts.length - 1) {
            return <span key={idx}>{part}</span>;
          }
          const answer = previewTexts?.[idx];
          return (
            <span key={idx}>
              {part}
              {answer ? (
                <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded mx-1 shadow-sm underline decoration-2 decoration-amber-600 inline-block text-xs sm:text-sm">
                  {answer}
                </span>
              ) : (
                <span className="bg-white/20 text-gray-300 font-mono font-bold px-1.5 py-0.5 rounded mx-1 border border-dashed border-white/40 inline-block text-xs sm:text-sm">
                  ____
                </span>
              )}
            </span>
          );
        })}
      </span>
    );
  } else if (validPreviews.length > 0) {
    content = (
      <span>
        {safeText}
        <div className="mt-2 space-y-1">
          {validPreviews.map((p, idx) => (
            <span
              key={idx}
              className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded shadow-sm block text-xs sm:text-sm"
            >
              ➔ {validPreviews.length > 1 ? `[${idx + 1}] ` : ''}{p}
            </span>
          ))}
        </div>
      </span>
    );
  } else if (pick > 1) {
    content = (
      <span>
        {safeText}
        <div className="mt-2 space-y-1">
          {Array.from({ length: pick }).map((_, idx) => {
            const p = previewTexts?.[idx];
            return p ? (
              <span
                key={idx}
                className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded shadow-sm block text-xs sm:text-sm"
              >
                ➔ [{idx + 1}] {p}
              </span>
            ) : (
              <span
                key={idx}
                className="bg-white/10 text-gray-400 font-mono font-bold px-2 py-0.5 rounded border border-dashed border-white/30 block text-xs"
              >
                ➔ [{idx + 1}] ____
              </span>
            );
          })}
        </div>
      </span>
    );
  } else {
    content = safeText;
  }

  return (
    <div className="relative w-full max-w-lg bg-black border border-white/30 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col justify-between max-h-[22dvh] sm:max-h-[25dvh] overflow-y-auto">
      <div className="text-sm sm:text-base md:text-lg font-black text-white leading-snug tracking-tight">
        {content}
      </div>

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/10 text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase shrink-0">
        <span>Cards Against Humanity</span>
        {pick > 1 ? (
          <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[10px]">
            {t('cah.pick_multi', { count: pick })}
          </span>
        ) : (
          <span className="text-amber-400">{t('cah.pick_one')}</span>
        )}
      </div>
    </div>
  );
}

// Renderiza uma Carta Branca (usada na mão do jogador ou na mesa)
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
  selectionBadge?: string | number | null;
  isWinner?: boolean;
  authorName?: string;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (!card) return null;
  const cardText = card.text || '';

  return (
    <motion.div
      whileHover={!disabled ? { y: -4, scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onMouseEnter={() => onHover && onHover(true)}
      onMouseLeave={() => onHover && onHover(false)}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-[clamp(100px,13vw,140px)] h-[clamp(150px,22dvh,205px)] aspect-[2/3] rounded-xl p-2.5 flex flex-col justify-between cursor-pointer select-none transition-all duration-150 border shadow-md shrink-0 ${
        isWinner
          ? 'bg-amber-400 text-slate-950 border-white ring-2 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.5)] z-20'
          : isSelected
          ? 'bg-white text-slate-950 border-purple-500 ring-2 ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] z-10'
          : disabled
          ? 'bg-zinc-200 text-zinc-400 border-zinc-300 cursor-not-allowed opacity-60'
          : 'bg-white text-slate-950 border-zinc-200 hover:border-zinc-400 hover:shadow-lg'
      }`}
    >
      <div className="font-bold text-[11px] sm:text-xs leading-snug tracking-tight text-slate-950 overflow-y-auto overflow-x-hidden break-words max-h-[85%] pr-0.5 custom-scrollbar">
        {cardText}
      </div>

      <div className="flex justify-between items-end pt-1 border-t border-gray-200 shrink-0">
        <span className="text-[8px] font-black uppercase tracking-wider text-gray-500 font-mono">
          PartyHub
        </span>
        {authorName && (
          <span className="px-1.5 py-0.2 bg-black text-white text-[8px] font-bold uppercase rounded">
            {authorName}
          </span>
        )}
      </div>

      {selectionBadge && (
        <div className="absolute -top-2 -left-2 bg-purple-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full shadow border border-white flex items-center gap-1 z-30">
          <span>{selectionBadge}</span>
        </div>
      )}

      {isWinner && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-black font-black text-[10px] px-1.5 py-0.5 rounded-full shadow border border-white flex items-center gap-0.5 z-30">
          <span>🏆</span> {t('cah.card_winner_badge')}
        </div>
      )}
    </motion.div>
  );
}

// Renderiza uma Carta com Animação 3D de Virar (Flip)
function FlippableCard({
  card,
  isRevealed,
  cardsCount = 1,
  cardIndex = 0,
  isCzar,
  allRevealed,
  isSelected,
  onCardClick,
  onHover,
}: {
  card?: CahWhiteCard | null;
  isRevealed: boolean;
  cardsCount?: number;
  cardIndex?: number;
  isCzar: boolean;
  allRevealed: boolean;
  isSelected: boolean;
  onCardClick: () => void;
  onHover?: (hovering: boolean) => void;
}) {
  const { t } = useTranslation();
  const [justRevealed, setJustRevealed] = useState(false);

  useEffect(() => {
    if (isRevealed) {
      setJustRevealed(true);
      const timer = setTimeout(() => setJustRevealed(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  const canClickToReveal = isCzar && !isRevealed;
  const canClickToSelect = isCzar && isRevealed && allRevealed;

  return (
    <div
      style={{ perspective: 1000 }}
      className="relative w-[clamp(100px,13vw,140px)] h-[clamp(150px,22dvh,205px)] aspect-[2/3] select-none shrink-0"
      onMouseEnter={() => isRevealed && onHover && onHover(true)}
      onMouseLeave={() => isRevealed && onHover && onHover(false)}
    >
      <AnimatePresence>
        {justRevealed && (
          <motion.div
            initial={{ opacity: 1, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute -inset-2 rounded-2xl bg-amber-400/30 blur-md pointer-events-none z-30"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          rotateY: isRevealed ? 0 : 180,
          scale: justRevealed ? [1, 1.08, 1] : 1,
        }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className={`w-full h-full relative cursor-pointer ${
          isSelected ? 'ring-2 ring-purple-400 rounded-xl' : ''
        }`}
        onClick={onCardClick}
      >
        {/* Face Frontal (Carta Revelada) */}
        <div
          style={{ backfaceVisibility: 'hidden' }}
          className={`absolute inset-0 w-full h-full rounded-xl p-2.5 flex flex-col justify-between border shadow-md bg-white text-slate-950 ${
            isSelected
              ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.35)]'
              : 'border-zinc-200'
          }`}
        >
          <div className="font-bold text-[11px] sm:text-xs leading-snug tracking-tight text-slate-950 overflow-y-auto overflow-x-hidden break-words max-h-[85%] custom-scrollbar">
            {card?.text || ''}
          </div>

          <div className="flex justify-between items-end pt-1 border-t border-gray-200 shrink-0">
            <span className="text-[8px] font-black uppercase tracking-wider text-gray-500 font-mono">
              PartyHub
            </span>
            {cardsCount > 1 && (
              <span className="px-1 py-0.2 bg-purple-100 text-purple-800 text-[8px] font-black rounded">
                {cardIndex + 1}/{cardsCount}
              </span>
            )}
          </div>

          {canClickToSelect && isSelected && (
            <div className="absolute -top-2 -right-2 bg-purple-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shadow border border-white z-20">
              ✓
            </div>
          )}
        </div>

        {/* Verso da Carta (Oculta) */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className={`absolute inset-0 w-full h-full rounded-xl p-2.5 flex flex-col justify-between border-2 shadow-md bg-zinc-900 border-zinc-700 text-white ${
            canClickToReveal
              ? 'hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)]'
              : ''
          }`}
        >
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <span className="text-xl sm:text-2xl mb-1">🃏</span>
            <span className="font-black text-[10px] tracking-widest text-zinc-300 uppercase">
              PartyHub
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-zinc-800 text-[8px] font-mono text-zinc-500 shrink-0">
            <span>CAH</span>
            {canClickToReveal && (
              <span className="text-amber-400 font-bold animate-pulse">
                {t('cah.czar_click_reveal')}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function CahGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { session } = useAuthStore();

  const {
    gameState,
    isReconnecting,
    reconnectAttempt,
    roundWinnerToast,
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
  } = useCahStore();

  const requiredPick = gameState?.currentBlackCard?.pick || 1;
  const discardsRemaining = gameState?.discardsRemaining ?? 2;

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isDiscardMode, setIsDiscardMode] = useState(false);
  const [selectedDiscardIds, setSelectedDiscardIds] = useState<string[]>([]);
  const [hoveredCardText, setHoveredCardText] = useState<string | null>(null);
  const [czarSelectedSubId, setCzarSelectedSubId] = useState<string | null>(null);
  const [czarHoveredTexts, setCzarHoveredTexts] = useState<string[] | null>(null);
  const [drawerTab, setDrawerTab] = useState<'players' | 'history' | 'rules' | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

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
    if (gameState?.state === 'ROUND_REVEAL') {
      setShowWinnerModal(true);
    }
  }, [gameState?.roundNumber, gameState?.state]);

  const handleCardClick = (cardId: string) => {
    if (isDiscardMode) {
      if (selectedDiscardIds.includes(cardId)) {
        setSelectedDiscardIds(selectedDiscardIds.filter((id) => id !== cardId));
      } else {
        if (selectedDiscardIds.length < discardsRemaining) {
          setSelectedDiscardIds([...selectedDiscardIds, cardId]);
        }
      }
      return;
    }

    if (selectedCardIds.includes(cardId)) {
      setSelectedCardIds(selectedCardIds.filter((id) => id !== cardId));
      return;
    }

    if (requiredPick === 1) {
      setSelectedCardIds([cardId]);
    } else {
      if (selectedCardIds.length < requiredPick) {
        setSelectedCardIds([...selectedCardIds, cardId]);
      } else {
        setSelectedCardIds([...selectedCardIds.slice(0, requiredPick - 1), cardId]);
      }
    }
  };

  if (!gameState) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-[#0a0a0a] text-white gap-4 font-sans">
        <div className="animate-spin text-4xl">🃏</div>
        <p className="font-bold text-sm tracking-wider uppercase text-zinc-400">
          {isReconnecting ? t('common.reconnecting', { attempt: reconnectAttempt }) : t('cah.loading_table')}
        </p>
      </div>
    );
  }

  const myId = session?.user?.id || '';
  const isLeader = gameState.players[0] === myId;
  const isCzar = gameState.isCzar;
  const myHand = gameState.myHand || [];
  const totalPlayers = gameState.players.length;

  let activePreviewTexts: (string | null | undefined)[] = [];
  if (gameState.state === 'ROUND_REVEAL') {
    if (gameState.roundWinner?.cards && gameState.roundWinner.cards.length > 0) {
      activePreviewTexts = gameState.roundWinner.cards.map((c) => c.text);
    } else if (roundWinnerToast?.cards && roundWinnerToast.cards.length > 0) {
      activePreviewTexts = roundWinnerToast.cards.map((c) => c.text);
    } else if (gameState.roundWinner?.card?.text) {
      activePreviewTexts = [gameState.roundWinner.card.text];
    }
  } else if (gameState.state === 'JUDGING') {
    if (czarHoveredTexts && czarHoveredTexts.length > 0) {
      activePreviewTexts = czarHoveredTexts;
    } else if (czarSelectedSubId) {
      const selectedSub = gameState.anonymousSubmissions?.find(
        (s) =>
          s.submissionId === czarSelectedSubId ||
          (s.cards && s.cards[0]?.id === czarSelectedSubId)
      );
      if (selectedSub?.cards) {
        activePreviewTexts = selectedSub.cards.map((c) => c.text);
      }
    }
  } else if (gameState.state === 'SELECTING_ANSWERS') {
    const selectedTexts = selectedCardIds
      .map((id) => myHand.find((c) => c.id === id)?.text)
      .filter(Boolean) as string[];

    if (hoveredCardText && !selectedTexts.includes(hoveredCardText)) {
      if (selectedTexts.length < requiredPick) {
        activePreviewTexts = [...selectedTexts, hoveredCardText];
      } else {
        activePreviewTexts = selectedTexts;
      }
    } else {
      activePreviewTexts = selectedTexts;
    }
  }

  const drawerTabs: TabOption[] = [
    { id: 'players', label: `Placar (${totalPlayers})`, icon: <Users size={14} /> },
    { id: 'history', label: 'Histórico', icon: <HistoryIcon size={14} /> },
    { id: 'rules', label: 'Regras', icon: <BookOpen size={14} /> },
  ];

  return (
    <GameShell
      themeClass="bg-zinc-950 text-white"
      header={
        <GameHeader
          gameTitle="CARDS AGAINST HUMANITY"
          gameBadge="HUMOR"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          accentColor="text-zinc-100"
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => setDrawerTab('players')}
          onToggleLog={() => setDrawerTab('history')}
          onToggleRules={() => setDrawerTab('rules')}
          centerContent={
            gameState.state !== 'LOBBY' && gameState.state !== 'GAME_OVER' ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                  <span>👑 Czar:</span>
                  <span className="truncate max-w-[100px]">{gameState.czarName || '...'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-xs font-mono font-bold hidden sm:inline">
                  Meta: {gameState.scoreToWin} pts
                </span>
              </div>
            ) : null
          }
        />
      }
      footer={
        /* Pinned Player Hand / Czar Dock */
        gameState.state === 'SELECTING_ANSWERS' ? (
          <div className="w-full bg-zinc-900/95 border-t border-white/10 px-2 py-2 backdrop-blur-md">
            <div className="max-w-5xl mx-auto flex flex-col gap-1.5">
              {/* Hand controls bar */}
              <div className="flex items-center justify-between px-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-300 uppercase text-[11px]">Sua Mão</span>
                  {isCzar ? (
                    <span className="text-amber-400 font-bold italic text-[11px]">Você é o Czar!</span>
                  ) : isDiscardMode ? (
                    <span className="px-2 py-0.5 bg-rose-950 border border-rose-500/50 rounded-full font-mono text-[10px] text-rose-300">
                      🗑️ Descartando ({selectedDiscardIds.length}/{discardsRemaining})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-white/10 rounded-full font-mono text-[10px] text-amber-300">
                      {selectedCardIds.length}/{requiredPick} cartas
                    </span>
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
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={selectedDiscardIds.length === 0}
                          onClick={() => {
                            discardCards(selectedDiscardIds);
                            setIsDiscardMode(false);
                            setSelectedDiscardIds([]);
                          }}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded text-[11px] font-bold"
                        >
                          Descartar ({selectedDiscardIds.length})
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
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 rounded text-[11px] font-bold"
                          >
                            🔄 Ciclar ({discardsRemaining})
                          </button>
                        )}
                        {selectedCardIds.length === requiredPick && (
                          <button
                            type="button"
                            onClick={() => submitAnswer(selectedCardIds)}
                            className="px-4 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-black uppercase tracking-wider shadow-md"
                          >
                            Enviar Carta(s) ✓
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Horizontally scrollable white cards rack */}
              <div className="w-full overflow-x-auto py-1 custom-scrollbar">
                <div className="flex gap-2 justify-start sm:justify-center min-w-max px-2">
                  {myHand.map((card) => {
                    let isSelected = false;
                    let badge: string | number | null = null;

                    if (isDiscardMode) {
                      isSelected = selectedDiscardIds.includes(card.id);
                      badge = isSelected ? '🗑️' : null;
                    } else {
                      const selIndex = selectedCardIds.indexOf(card.id);
                      isSelected = selIndex !== -1;
                      badge = isSelected
                        ? requiredPick > 1
                          ? `[${selIndex + 1}]`
                          : '✓'
                        : null;
                    }

                    const disabled = isCzar || gameState.hasSubmitted;

                    return (
                      <WhiteCardView
                        key={card.id}
                        card={card}
                        isSelected={isSelected}
                        selectionBadge={badge}
                        disabled={disabled}
                        onHover={(hovering) =>
                          !disabled && setHoveredCardText(hovering ? card.text : null)
                        }
                        onClick={() => !disabled && handleCardClick(card.id)}
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
          {/* Winner Modal */}
          <AnimatePresence>
            {gameState.state === 'ROUND_REVEAL' && gameState.roundWinner && showWinnerModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative w-full max-w-lg bg-zinc-900 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-center space-y-4"
                >
                  <div className="text-4xl">👑</div>
                  <div>
                    <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                      Vencedor da Rodada
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1">
                      {gameState.roundWinner.playerName}
                    </h3>
                  </div>

                  <div className="p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-gray-300">
                    <p className="font-bold text-white mb-1">Resposta Campeã:</p>
                    <p className="italic">
                      "{gameState.roundWinner.cards?.map((c) => c.text).join(' + ') || gameState.roundWinner.card?.text}"
                    </p>
                  </div>

                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      onClick={() => setShowWinnerModal(false)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
                    >
                      Ver Mesa
                    </button>
                    {(isCzar || isLeader) && (
                      <button
                        onClick={nextRound}
                        className="px-6 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider"
                      >
                        Próxima Rodada &rarr;
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Off-canvas Side Drawer */}
          <SideDrawer
            isOpen={drawerTab !== null}
            onClose={() => setDrawerTab(null)}
            title="Cards Against Humanity"
            tabs={drawerTabs}
            activeTab={drawerTab || 'players'}
            onTabChange={(tab) => setDrawerTab(tab as any)}
          >
            {drawerTab === 'players' && (
              <div className="space-y-3">
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>Placar (Meta: {gameState.scoreToWin} pts)</span>
                  <span>{gameState.players.length} jogadores</span>
                </div>
                <div className="space-y-2">
                  {gameState.players.map((pid) => {
                    const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                    const pScore = gameState.scores?.[pid] || 0;
                    const pIsCzar = pid === gameState.czarId;
                    const pSubmitted = gameState.submittedStatus?.[pid];
                    const isMe = pid === myId;

                    return (
                      <div
                        key={pid}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          pIsCzar
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                            : isMe
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {pIsCzar ? (
                            <span title="Czar">👑</span>
                          ) : pSubmitted ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-gray-500">○</span>
                          )}
                          <span className="font-bold truncate">
                            {pName} {isMe && <span className="text-zinc-400 text-[10px]">(Você)</span>}
                          </span>
                        </div>
                        <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-black/40 border border-white/10">
                          {pScore} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {drawerTab === 'history' && (
              <div className="space-y-2 text-xs text-gray-400">
                <p className="italic text-center py-4">Histórico das rodadas anteriores gravado automaticamente.</p>
              </div>
            )}

            {drawerTab === 'rules' && (
              <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Como Jogar</h4>
                  <p>A cada rodada, um jogador é o Czar e apresenta uma Carta Preta com uma pergunta ou frase para preencher.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Respostas Brancas</h4>
                  <p>Todos os outros jogadores escolhem secretamente suas cartas brancas mais engraçadas ou absurdas para completar a frase.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">Julgamento do Czar</h4>
                  <p>O Czar lê as combinações anonimamente e escolhe a favorita. O dono da resposta ganha 1 ponto.</p>
                </div>
              </div>
            )}
          </SideDrawer>
        </>
      }
    >
      {/* 1. LOBBY */}
      {gameState.state === 'LOBBY' && (
        <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col items-center text-center space-y-3.5 my-auto max-h-[90dvh] overflow-y-auto custom-scrollbar">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/20 flex items-center justify-center text-3xl">
            🃏
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase">
              Cards Against Humanity
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Um jogo festivo para pessoas horríveis. Mínimo de 3 jogadores para iniciar.
            </p>
          </div>

          {/* Jogadores Conectados e Prontos */}
          <div className="w-full p-3 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Jogadores Conectados ({gameState.players.length})
              </span>
              <span className="font-mono text-amber-300 text-xs font-bold">
                {gameState.players.filter((p) => gameState.playerReady?.[p]).length}/{gameState.players.length} Prontos
              </span>
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {gameState.players.map((pid) => {
                const isOnline = gameState.playerConnected?.[pid] !== false;
                const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                const isReady = gameState.playerReady?.[pid];
                const isMe = pid === myId;
                const isRoomLeader = gameState.players[0] === pid;

                return (
                  <div
                    key={pid}
                    className={`px-3 py-2 rounded-xl border flex items-center justify-between text-xs ${
                      isOnline
                        ? 'bg-black/50 border-white/10 text-white'
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                      <span className="font-bold truncate">
                        {pName} {isMe && '(Você)'} {isRoomLeader && '👑'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        isReady
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {isReady ? '✓ Pronto' : 'Aguardando'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configurações da Partida (Idioma do Baralho & Meta de Pontos) */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-1.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Idioma do Baralho:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={!isLeader}
                  onClick={() => sendMessage('SET_LANGUAGE', { language: 'pt' })}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    (gameState.language || 'pt') === 'pt'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-black/40 text-gray-400 hover:text-white'
                  }`}
                >
                  🇧🇷 PT
                </button>
                <button
                  type="button"
                  disabled={!isLeader}
                  onClick={() => sendMessage('SET_LANGUAGE', { language: 'en' })}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    gameState.language === 'en'
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-black/40 text-gray-400 hover:text-white'
                  }`}
                >
                  🇺🇸 EN
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between gap-1.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Meta de Pontos: <strong className="text-amber-400">{gameState.scoreToWin || 5} pts</strong>
              </span>
              {isLeader ? (
                <div className="flex gap-1">
                  {[3, 5, 7, 10].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setOptions(pts)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        gameState.scoreToWin === pts
                          ? 'bg-amber-500 text-black shadow'
                          : 'bg-black/40 text-gray-400 hover:text-white'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-[11px]">Definido pelo líder</span>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 pt-1">
            <button
              onClick={toggleReady}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                gameState.playerReady?.[myId]
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {gameState.playerReady?.[myId] ? '✓ Pronto' : 'Estou Pronto'}
            </button>

            {isLeader && (
              <button
                onClick={startGame}
                disabled={
                  !gameState.players.every((p) => gameState.playerReady?.[p]) ||
                  gameState.players.length < 3
                }
                className="w-full py-3 bg-white hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
              >
                {gameState.players.length < 3 ? 'Mínimo de 3 Jogadores' : 'Iniciar Partida 🚀'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. ACTIVE GAMEPLAY */}
      {gameState.state !== 'LOBBY' && gameState.state !== 'GAME_OVER' && (
        <div className="w-full max-w-4xl flex flex-col items-center justify-between h-full py-1">
          {/* Black Card Stage */}
          {gameState.currentBlackCard && (
            <div className="w-full flex justify-center shrink-0">
              <BlackCardView
                text={gameState.currentBlackCard.text}
                pick={requiredPick}
                previewTexts={activePreviewTexts}
              />
            </div>
          )}

          {/* Center Table (Submissions during Judging or Reveal) */}
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0 my-2">
            {gameState.state === 'SELECTING_ANSWERS' && (
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300">
                  <span>Cartas enviadas:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {gameState.submissionsCount} / {gameState.totalExpectedSubmissions}
                  </span>
                </div>
                {isCzar && (
                  <p className="text-xs text-amber-400 font-medium">
                    👑 Você é o Czar. Aguarde os outros jogadores enviarem suas respostas!
                  </p>
                )}
              </div>
            )}

            {(gameState.state === 'JUDGING' || gameState.state === 'ROUND_REVEAL') && (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="w-full overflow-x-auto py-2 custom-scrollbar">
                  <div className="flex gap-3 justify-center min-w-max px-4">
                    {gameState.state === 'JUDGING' &&
                      gameState.anonymousSubmissions?.map((sub: AnonymousSubmission) => {
                        const isRevealed = !!sub.isRevealed;
                        const cardsCount =
                          sub.cardsCount ||
                          (sub.cards && sub.cards.length > 0 ? sub.cards.length : 1);
                        const subCards =
                          sub.cards && sub.cards.length > 0
                            ? sub.cards
                            : Array.from({ length: cardsCount }, (_, i) => ({
                                id: `${sub.submissionId}_${i}`,
                                text: '',
                              }));
                        const isSelected = czarSelectedSubId === sub.submissionId;
                        const allRevealed = !!gameState.allSubmissionsRevealed;

                        const handleRevealOrSelect = () => {
                          if (!isRevealed) {
                            if (isCzar) revealSubmission(sub.submissionId);
                          } else if (allRevealed && isCzar) {
                            setCzarSelectedSubId(sub.submissionId);
                          }
                        };

                        return (
                          <div key={sub.submissionId} className="flex flex-col items-center gap-2">
                            <div className="flex gap-2">
                              {subCards.map((card, i) => (
                                <FlippableCard
                                  key={card.id || i}
                                  card={card}
                                  isRevealed={isRevealed}
                                  cardsCount={cardsCount}
                                  cardIndex={i}
                                  isCzar={isCzar}
                                  allRevealed={allRevealed}
                                  isSelected={isSelected}
                                  onCardClick={handleRevealOrSelect}
                                  onHover={(hovering) => {
                                    if (isRevealed && allRevealed && sub.cards) {
                                      setCzarHoveredTexts(
                                        hovering ? sub.cards.map((c) => c.text) : null
                                      );
                                    }
                                  }}
                                />
                              ))}
                            </div>

                            {isCzar && allRevealed && isSelected && (
                              <button
                                onClick={() => selectWinner(sub.submissionId)}
                                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-lg shadow-md cursor-pointer"
                              >
                                👑 Escolher Vencedor
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
                                selectionBadge={cards.length > 1 ? `[${i + 1}]` : undefined}
                                isWinner={sub.isWinner}
                                authorName={i === cards.length - 1 ? sub.playerName : undefined}
                                disabled
                              />
                            ))}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {gameState.state === 'ROUND_REVEAL' && !showWinnerModal && (
                  <button
                    onClick={nextRound}
                    className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                  >
                    Próxima Rodada &rarr;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. GAME OVER */}
      {gameState.state === 'GAME_OVER' && (
        <div className="w-full max-w-md bg-zinc-900 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4 my-auto">
          <div className="text-5xl">👑</div>
          <div>
            <h2 className="text-3xl font-black text-amber-400">
              {t('cah.champion_title')}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Partida concluída! Parabéns ao campeão.
            </p>
          </div>

          <div className="w-full flex gap-3 pt-2">
            <button
              onClick={restartGame}
              className="flex-1 py-2.5 bg-white hover:bg-gray-200 text-slate-950 font-black text-xs uppercase rounded-xl cursor-pointer"
            >
              Jogar Novamente
            </button>
            <button
              onClick={() => navigate('/hub')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl cursor-pointer"
            >
              Hub
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
