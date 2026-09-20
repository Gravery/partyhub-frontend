import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCahStore, type CahWhiteCard, type AnonymousSubmission } from '../store/useCahStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageSelector } from '../components/LanguageSelector';

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
  const validPreviews = previewTexts?.filter(Boolean) as string[] || [];

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
                <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded mx-1 shadow-md underline decoration-2 decoration-amber-600 inline-block">
                  {answer}
                </span>
              ) : (
                <span className="bg-white/20 text-gray-300 font-mono font-bold px-2 py-0.5 rounded mx-1 border border-dashed border-white/40 inline-block">
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
        <div className="mt-3 space-y-1">
          {validPreviews.map((p, idx) => (
            <span
              key={idx}
              className="bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded shadow-md block text-base"
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
        <div className="mt-3 space-y-1.5">
          {Array.from({ length: pick }).map((_, idx) => {
            const p = previewTexts?.[idx];
            return p ? (
              <span
                key={idx}
                className="bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded shadow-md block text-base"
              >
                ➔ [{idx + 1}] {p}
              </span>
            ) : (
              <span
                key={idx}
                className="bg-white/10 text-gray-400 font-mono font-bold px-2.5 py-1 rounded border border-dashed border-white/30 block text-sm"
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
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative w-full max-w-xl bg-black border-2 border-white/80 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(255,255,255,0.15)] flex flex-col justify-between min-h-[220px]"
    >
      <div className="text-xl md:text-2xl font-black text-white leading-snug tracking-wide">
        {content}
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/20 text-xs font-mono font-bold tracking-widest text-gray-400 uppercase">
        <span>{t('cah.game_title')}</span>
        {pick > 1 ? (
          <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black rounded-lg shadow-md animate-pulse">
            {t('cah.pick_multi', { count: pick })}
          </span>
        ) : (
          <span className="text-amber-400 font-bold">{t('cah.pick_one')}</span>
        )}
      </div>
    </motion.div>
  );
}

// Renderiza uma Carta Branca (usada na mão do jogador ou na mesa do Czar)
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
      whileHover={!disabled ? { y: -8, scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onMouseEnter={() => onHover && onHover(true)}
      onMouseLeave={() => onHover && onHover(false)}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-44 h-60 md:w-48 md:h-64 rounded-2xl p-4 flex flex-col justify-between cursor-pointer select-none transition-all duration-200 border-2 shadow-xl ${
        isWinner
          ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-105 z-20'
          : isSelected
          ? 'bg-white text-slate-950 border-purple-500 ring-4 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)] scale-105 z-10'
          : disabled
          ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-60'
          : 'bg-white text-slate-950 border-gray-300 hover:border-gray-500 hover:shadow-2xl'
      }`}
    >
      <div className="font-bold text-sm md:text-base leading-snug tracking-tight text-slate-900">
        {cardText}
      </div>

      <div className="flex justify-between items-end pt-3 border-t border-gray-200/80">
        <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 font-mono">
          PartyHub CAH
        </span>
        {authorName && (
          <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase rounded-md shadow-sm">
            {authorName}
          </span>
        )}
      </div>

      {selectionBadge && (
        <div className="absolute -top-3 -left-3 bg-purple-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1 z-30">
          <span>{selectionBadge}</span>
        </div>
      )}

      {isWinner && (
        <div className="absolute -top-3 -right-3 bg-amber-500 text-black font-black text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1 z-30">
          <span>🏆</span> {t('cah.card_winner_badge')}
        </div>
      )}
    </motion.div>
  );
}

// Renderiza uma Carta com Animação 3D de Virar (Flip) e Efeito de Impacto
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
      const timer = setTimeout(() => setJustRevealed(false), 900);
      return () => clearTimeout(timer);
    }
  }, [isRevealed]);

  const canClickToReveal = isCzar && !isRevealed;
  const canClickToSelect = isCzar && isRevealed && allRevealed;

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative w-44 h-60 md:w-48 md:h-64 select-none"
      onMouseEnter={() => isRevealed && onHover && onHover(true)}
      onMouseLeave={() => isRevealed && onHover && onHover(false)}
    >
      {/* Efeito de Impacto / Shockwave ao Virar a Carta */}
      <AnimatePresence>
        {justRevealed && (
          <motion.div
            initial={{ opacity: 1, scale: 0.85 }}
            animate={{ opacity: 0, scale: 1.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="absolute -inset-4 rounded-3xl bg-amber-400/40 blur-xl pointer-events-none z-30"
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          rotateY: isRevealed ? 0 : 180,
          scale: justRevealed ? [1, 1.14, 1] : 1,
        }}
        transition={{
          rotateY: { duration: 0.65, type: 'spring', stiffness: 220, damping: 20 },
          scale: { duration: 0.55, ease: 'easeOut' },
        }}
        style={{ transformStyle: 'preserve-3d' }}
        onClick={onCardClick}
        className={`w-full h-full relative cursor-pointer ${
          canClickToReveal
            ? 'hover:scale-105 active:scale-95'
            : canClickToSelect
            ? 'hover:-translate-y-2'
            : ''
        } transition-transform duration-200`}
      >
        {/* FRENTE DA CARTA (REVELADA) */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className={`absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col justify-between border-2 shadow-xl bg-white text-slate-950 transition-all duration-200 ${
            isSelected
              ? 'border-purple-500 ring-4 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)] scale-105 z-20'
              : 'border-gray-300 hover:border-amber-400 hover:shadow-2xl'
          }`}
        >
          <div className="font-bold text-sm md:text-base leading-snug tracking-tight text-slate-900">
            {card?.text || ''}
          </div>

          <div className="flex justify-between items-end pt-3 border-t border-gray-200/80">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 font-mono">
              PartyHub CAH
            </span>
            {cardsCount > 1 && (
              <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded-md shadow-sm">
                [{cardIndex + 1}/{cardsCount}]
              </span>
            )}
          </div>

          {cardsCount > 1 && (
            <div className="absolute -top-3 -left-3 bg-purple-600 text-white font-black text-xs px-2.5 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1 z-30">
              <span>{`[${cardIndex + 1}]`}</span>
            </div>
          )}
        </div>

        {/* VERSO DA CARTA (VIRADA PARA BAIXO) */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
          className={`absolute inset-0 w-full h-full rounded-2xl p-3 flex flex-col justify-between items-center text-center border-2 shadow-2xl bg-gradient-to-br from-zinc-900 via-neutral-900 to-black ${
            canClickToReveal
              ? 'border-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.35)] hover:border-amber-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.6)]'
              : 'border-white/20'
          }`}
        >
          {/* Moldura interna decorativa */}
          <div className="w-full h-full border border-dashed border-white/20 rounded-xl p-3 flex flex-col justify-between items-center relative overflow-hidden">
            {/* Padrão geométrico suave no fundo */}
            <div className="absolute inset-0 opacity-5 bg-[repeating-linear-gradient(45deg,#fff,#fff_2px,transparent_2px,transparent_8px)] pointer-events-none" />

            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono z-10">
              {t('cah.deck_back_top')}
            </div>

            {/* Centro: Ação ou Estado */}
            <div className="flex flex-col items-center gap-2 z-10">
              <div className="text-3xl filter drop-shadow">🎭</div>
              {canClickToReveal ? (
                <div className="px-3 py-1.5 bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.7)] animate-pulse border border-white">
                  {t('cah.reveal_action_badge')}
                </div>
              ) : (
                <div className="text-gray-400 font-mono text-[11px] font-bold uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                  {t('cah.hidden_action_badge')}
                </div>
              )}
            </div>

            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono z-10">
              {t('cah.deck_back_bottom')}
            </div>

            {cardsCount > 1 && (
              <div className="absolute top-2 right-2 bg-white/20 text-gray-200 font-mono font-black text-[9px] px-1.5 py-0.5 rounded">
                [{cardIndex + 1}/{cardsCount}]
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function CahGameRoom() {
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
    roundWinnerToast,
    clearWinnerToast,
    toggleReady,
    setOptions,
    startGame,
    submitAnswer,
    revealSubmission,
    selectWinner,
    nextRound,
    restartGame,
    disconnectNotice,
  } = useCahStore();

  const [copied, setCopied] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [hoveredCardText, setHoveredCardText] = useState<string | null>(null);
  const [czarSelectedSubId, setCzarSelectedSubId] = useState<string | null>(null);
  const [czarHoveredTexts, setCzarHoveredTexts] = useState<string[] | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(true);

  const requiredPick = gameState?.currentBlackCard?.pick || 1;

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

  // Limpa seleção local quando o estado avança para outra rodada e reabre o modal de vencedor
  useEffect(() => {
    setSelectedCardIds([]);
    setHoveredCardText(null);
    setCzarSelectedSubId(null);
    setCzarHoveredTexts(null);
    clearWinnerToast();
    if (gameState?.state === 'ROUND_REVEAL') {
      setShowWinnerModal(true);
    }
  }, [gameState?.roundNumber, gameState?.state]);

  // Auto-dispensa do toast de vencedor da rodada após 6 segundos
  useEffect(() => {
    if (roundWinnerToast) {
      const timer = setTimeout(() => {
        clearWinnerToast();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [roundWinnerToast]);

  const handleCardClick = (cardId: string) => {
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
        // Se já atingiu o limite de cartas necessárias, substitui a última escolha
        setSelectedCardIds([...selectedCardIds.slice(0, requiredPick - 1), cardId]);
      }
    }
  };

  if (!isConnected && !gameState && !isReconnecting) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0a0a0a] text-white gap-4 font-sans">
        <div className="animate-spin text-4xl">🃏</div>
        <p className="font-bold text-lg">{t('cah.entering_room', { roomId })}</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#0a0a0a] text-white gap-4 font-sans">
        <div className="animate-spin text-4xl">⏳</div>
        <p className="font-bold text-lg">{t('cah.loading_table')}</p>
      </div>
    );
  }

  const myId = session?.user?.id || '';
  const isLeader = gameState.players[0] === myId;
  const isCzar = gameState.isCzar;
  const myHand = gameState.myHand || [];

  // Determina os textos a preencher nas lacunas da carta preta
  let activePreviewTexts: (string | null | undefined)[] = [];

  if (gameState.state === 'ROUND_REVEAL') {
    if (gameState.roundWinner?.cards && gameState.roundWinner.cards.length > 0) {
      activePreviewTexts = gameState.roundWinner.cards.map((c) => c.text);
    } else if (roundWinnerToast?.cards && roundWinnerToast.cards.length > 0) {
      activePreviewTexts = roundWinnerToast.cards.map((c) => c.text);
    } else if (gameState.roundWinner?.card?.text) {
      activePreviewTexts = [gameState.roundWinner.card.text];
    } else if (roundWinnerToast?.card?.text) {
      activePreviewTexts = [roundWinnerToast.card.text];
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

  const roundWinnerInfo = gameState.roundWinner || roundWinnerToast;

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans overflow-x-hidden flex flex-col justify-between select-none">
      <div className="crt-overlay" />

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
          <span><strong>{t('common.attention')}:</strong> {errorMsg}</span>
          <span className="text-red-400 text-xs underline">{t('common.close')}</span>
        </div>
      )}

      {/* MODAL SINCRONIZADO E PERSISTENTE DO VENCEDOR DA RODADA */}
      <AnimatePresence>
        {gameState.state === 'ROUND_REVEAL' && roundWinnerInfo && showWinnerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-3xl bg-gradient-to-b from-zinc-900 via-neutral-950 to-black border-2 border-amber-400 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(251,191,36,0.45)] my-auto flex flex-col items-center text-center overflow-hidden"
            >
              {/* Efeitos de Iluminação de Fundo */}
              <div className="absolute -top-24 -left-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Botão Minimizar para Ver a Mesa Completa */}
              <button
                onClick={() => setShowWinnerModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                title={t('cah.view_table')}
              >
                <span>{t('cah.view_table')}</span>
                <span className="text-sm font-black">✕</span>
              </button>

              {/* Título & Vencedor */}
              <div className="flex flex-col items-center gap-1 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400/10 border border-amber-400/40 text-amber-300 text-xs uppercase tracking-widest font-black">
                  <span>🏆</span> {t('cah.round_winner_badge')}
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white mt-1 tracking-tight">
                  <span className="text-amber-400">{roundWinnerInfo.playerName}</span> {t('cah.round_winner_title', { name: '' }).trim()}
                </h2>
                <p className="text-sm text-amber-200/90 font-medium">
                  {t('cah.round_winner_points', { points: roundWinnerInfo.pointsWon || (roundWinnerInfo.cards?.length || 1) })}
                </p>
              </div>

              {/* Pré-visualização da Combinação Vencedora */}
              <div className="w-full flex flex-col items-center gap-4 mb-6">
                <BlackCardView
                  text={roundWinnerInfo.blackCard?.text || gameState.currentBlackCard?.text}
                  pick={roundWinnerInfo.cards?.length || 1}
                  previewTexts={
                    roundWinnerInfo.cards && roundWinnerInfo.cards.length > 0
                      ? roundWinnerInfo.cards.map((c) => c.text)
                      : [roundWinnerInfo.card?.text || roundWinnerInfo.winningCard?.text || '']
                  }
                />

                {/* Cartas Brancas Vencedoras */}
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {(roundWinnerInfo.cards && roundWinnerInfo.cards.length > 0
                    ? roundWinnerInfo.cards
                    : [roundWinnerInfo.card || roundWinnerInfo.winningCard]
                  ).map((c, i) =>
                    c ? (
                      <WhiteCardView
                        key={c.id || i}
                        card={c}
                        isWinner={true}
                        selectionBadge={
                          roundWinnerInfo.cards && roundWinnerInfo.cards.length > 1
                            ? `[${i + 1}]`
                            : undefined
                        }
                        authorName={roundWinnerInfo.playerName}
                        disabled
                      />
                    ) : null
                  )}
                </div>
              </div>

              {/* Ação Única para Avançar para a Próxima Rodada */}
              <div className="w-full flex flex-col items-center gap-3 pt-4 border-t border-white/10">
                {isCzar || isLeader ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={nextRound}
                    className="px-10 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-base md:text-lg uppercase tracking-widest rounded-2xl shadow-[0_0_35px_rgba(251,191,36,0.6)] border-2 border-white transition-all flex items-center gap-3 cursor-pointer"
                  >
                    <span>{t('cah.advance_next_round')}</span>
                    <span className="text-2xl font-black">➔</span>
                  </motion.button>
                ) : (
                  <div className="px-6 py-3 bg-amber-950/50 border border-amber-500/40 rounded-2xl text-amber-300 font-medium text-sm flex items-center gap-2">
                    <span className="animate-spin text-base">⏳</span>
                    <span>
                      {t('cah.waiting_czar_advance', { name: gameState.czarName ? `(${gameState.czarName})` : '' })}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Botão Flutuante de Reabertura (quando o jogador minimiza para ver a mesa) */}
        {gameState.state === 'ROUND_REVEAL' && roundWinnerInfo && !showWinnerModal && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={() => setShowWinnerModal(true)}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] border-2 border-white flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <span>🏆</span>
            <span>{t('cah.view_winner', { name: roundWinnerInfo.playerName })}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cabeçalho */}
      <header className="relative z-10 mb-6 flex flex-col md:flex-row justify-between items-center border-b border-white/10 pb-4 gap-4">
        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-4">
          <h1 className="text-3xl md:text-4xl font-black tracking-widest text-white uppercase">
            {t('cah.game_title')}
          </h1>
          <div className="flex items-center gap-3 flex-wrap font-mono text-sm uppercase tracking-wider">
            <span className="text-gray-400">
              {t('common.room')}: <span className="text-amber-400 font-bold">{roomId}</span>
            </span>
            <button
              onClick={handleCopyInvite}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-gray-200 rounded font-mono text-xs uppercase tracking-wider transition-all"
            >
              {copied ? t('common.copied') : t('common.copy_invite')}
            </button>
          </div>
        </div>

        {/* Status de Rodada & Botão Sair */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          {gameState.state !== 'LOBBY' && (
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl font-bold text-xs uppercase tracking-wider text-gray-200">
                {t('common.round')} {gameState.roundNumber}
              </span>
              <span className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>{t('cah.czar_label')}</span>
                <span className="font-black text-white">{gameState.czarName || 'Czar'}</span>
              </span>
            </div>
          )}

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
        
        {/* 1. FASE DE LOBBY */}
        {gameState.state === 'LOBBY' && (
          <div className="max-w-2xl mx-auto my-auto text-center space-y-6 w-full py-4">
            <div>
              <h2 className="text-3xl font-black text-white tracking-wide mb-1">
                {t('cah.lobby_title')}
              </h2>
              <p className="text-gray-400 text-sm">
                {t('cah.lobby_desc')}
              </p>
            </div>

            {/* Configuração de Meta de Pontuação */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-5 text-left shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                  {t('cah.score_goal')}
                </span>
                {isLeader && (
                  <span className="text-[11px] text-amber-400 font-mono">{t('cah.leader_badge')}</span>
                )}
              </div>

              <div className="flex gap-3">
                {[5, 7, 10].map((pts) => {
                  const isSelected = gameState.scoreToWin === pts;
                  return (
                    <button
                      key={pts}
                      disabled={!isLeader}
                      onClick={() => isLeader && setOptions(pts)}
                      className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider border-2 transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 border-white shadow-lg'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:border-white/30'
                      } ${!isLeader ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                    >
                      {t('cah.pts_suffix', { count: pts })}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de Jogadores */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-5 text-left space-y-3 shadow-xl">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest block mb-1">
                {t('cah.players_in_room', { current: gameState.players.length })}
              </span>

              {gameState.players.map((pid) => {
                const isReady = gameState.playerReady?.[pid];
                const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                const isMe = pid === myId;

                return (
                  <div
                    key={pid}
                    className="flex justify-between items-center bg-black/40 p-3.5 rounded-xl border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <span className={`font-medium ${isMe ? 'text-amber-400 font-bold' : 'text-gray-200'}`}>
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
                        <span>{isReady ? t('cah.ready') : t('cah.not_ready')}</span>
                      </button>
                    ) : (
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          isReady
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse'
                        }`}
                      >
                        {isReady ? t('cah.is_ready') : t('cah.waiting')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Iniciar Partida */}
            {isLeader && (
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  onClick={startGame}
                  disabled={
                    !gameState.players.every((p) => gameState.playerReady?.[p]) ||
                    gameState.players.length < 3
                  }
                  className="px-10 py-5 bg-white hover:bg-gray-200 text-slate-950 border-2 border-white rounded-2xl font-black tracking-wider text-xl transition-all shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  {t('cah.start_match')}
                </button>
                {gameState.players.length < 3 && (
                  <p className="text-xs text-amber-400 font-medium">
                    {t('cah.min_players_warn')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. FASE EM JOGO (RESPOSTAS, JULGAMENTO OU REVELAÇÃO) */}
        {gameState.state !== 'LOBBY' && gameState.state !== 'GAME_OVER' && (
          <div className="flex flex-col justify-between flex-grow gap-6">
            
            {/* TOPO: CARTA PRETA CENTRAL + PLACAR LATERAL */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
              
              {/* CARTA PRETA CENTRAL */}
              {gameState.currentBlackCard && (
                <div className="flex-grow flex flex-col items-center max-w-xl w-full">
                  <BlackCardView
                    text={gameState.currentBlackCard.text}
                    pick={requiredPick}
                    previewTexts={activePreviewTexts}
                  />

                  {/* Banner Informativo de Fase */}
                  <div className="mt-4 text-center">
                    {gameState.state === 'SELECTING_ANSWERS' && (
                      <div className="text-xs font-bold uppercase tracking-wider">
                        {isCzar ? (
                          <span className="text-amber-400 bg-amber-950/60 px-4 py-1.5 rounded-full border border-amber-500/30 inline-block animate-pulse">
                            {t('cah.czar_you', {
                              current: gameState.submissionsCount,
                              total: gameState.totalExpectedSubmissions,
                            })}
                          </span>
                        ) : gameState.hasSubmitted ? (
                          <span className="text-emerald-400 bg-emerald-950/60 px-4 py-1.5 rounded-full border border-emerald-500/30 inline-block">
                            {t('cah.submitted_wait', {
                              current: gameState.submissionsCount,
                              total: gameState.totalExpectedSubmissions,
                            })}
                          </span>
                        ) : (
                          <span className="text-purple-300 bg-purple-950/60 px-4 py-1.5 rounded-full border border-purple-500/30 inline-block">
                            {requiredPick > 1
                              ? t('cah.select_multi_inst', { count: requiredPick })
                              : t('cah.select_one_inst')}
                          </span>
                        )}
                      </div>
                    )}

                    {gameState.state === 'JUDGING' && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                            {t('cah.cards_revealed_counter', {
                              current: gameState.revealedSubmissionsCount || 0,
                              total: gameState.totalExpectedSubmissions,
                            })}
                          </span>
                          {gameState.allSubmissionsRevealed ? (
                            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                              {t('cah.all_revealed')}
                            </span>
                          ) : (
                            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {t('cah.revealing_in_progress')}
                            </span>
                          )}
                        </div>

                        <div className="text-xs md:text-sm font-bold uppercase tracking-wider">
                          {!gameState.allSubmissionsRevealed ? (
                            isCzar ? (
                              <span className="text-amber-400 bg-amber-950/80 px-5 py-2 rounded-full border border-amber-500/40 inline-flex items-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.3)] animate-pulse">
                                <span>👁️</span>
                                <span>{t('cah.czar_reveal_inst')}</span>
                              </span>
                            ) : (
                              <span className="text-gray-300 bg-black/70 px-5 py-2 rounded-full border border-white/10 inline-flex items-center gap-2 animate-pulse">
                                <span>⏳</span>
                                <span>{t('cah.player_reveal_inst', { name: gameState.czarName })}</span>
                              </span>
                            )
                          ) : (
                            isCzar ? (
                              <span className="text-amber-300 bg-amber-950/80 px-5 py-2 rounded-full border border-amber-500/40 inline-flex items-center gap-2 shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                                <span>👑</span>
                                <span>{t('cah.czar_judge_inst')}</span>
                              </span>
                            ) : (
                              <span className="text-amber-300 bg-black/70 px-5 py-2 rounded-full border border-amber-500/20 inline-flex items-center gap-2">
                                <span>👑</span>
                                <span>{t('cah.player_judge_inst', { name: gameState.czarName })}</span>
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {gameState.state === 'ROUND_REVEAL' && (
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-950/60 px-4 py-1.5 rounded-full border border-amber-500/30 inline-flex items-center gap-2">
                        <span>{t('cah.round_completed_banner')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PLACAR LATERAL */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 min-w-[240px] max-w-xs w-full shadow-xl">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {t('cah.scoreboard_title', { score: gameState.scoreToWin })}
                  </span>
                </div>

                <div className="space-y-2">
                  {gameState.players.map((pid) => {
                    const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                    const pScore = gameState.scores?.[pid] || 0;
                    const pIsCzar = pid === gameState.czarId;
                    const pSubmitted = gameState.submittedStatus?.[pid];
                    const isMe = pid === myId;
                    const isRoundWinner =
                      gameState.state === 'ROUND_REVEAL' &&
                      roundWinnerInfo?.playerId === pid;
                    const pointsWon =
                      roundWinnerInfo?.pointsWon ||
                      (roundWinnerInfo?.cards?.length || 1);

                    return (
                      <div
                        key={pid}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                          isRoundWinner
                            ? 'bg-amber-950/70 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] text-amber-200 scale-[1.02]'
                            : pIsCzar
                            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                            : isMe
                            ? 'bg-white/10 border-white/30 text-white font-bold'
                            : 'bg-black/30 border-white/5 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isRoundWinner ? (
                            <span title={t('cah.round_winner_badge')}>🏆</span>
                          ) : pIsCzar ? (
                            <span title={t('cah.czar_label')}>👑</span>
                          ) : pSubmitted ? (
                            <span className="text-emerald-400" title={t('itto.submitted')}>✓</span>
                          ) : (
                            <span className="text-gray-600">○</span>
                          )}
                          <span className="truncate">
                            {pName} {isMe && t('common.you')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isRoundWinner && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: [1, 1.18, 1], opacity: 1 }}
                              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
                              className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full shadow-md whitespace-nowrap"
                            >
                              +{pointsWon} {t('common.pts')}
                            </motion.span>
                          )}
                          <span
                            className={`font-black text-sm px-2 py-0.5 rounded-md border ${
                              isRoundWinner
                                ? 'bg-amber-400 text-slate-950 border-white'
                                : 'bg-black/60 border-white/10'
                            }`}
                          >
                            {pScore}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MEIO: MESA DE CARTAS SUBMETIDAS (EM JULGAMENTO OU REVELAÇÃO) */}
            {(gameState.state === 'JUDGING' || gameState.state === 'ROUND_REVEAL') && (
              <div className="flex flex-col items-center gap-4 my-4">
                <div className="flex justify-between items-center w-full max-w-4xl px-2">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                    {gameState.state === 'JUDGING'
                      ? gameState.allSubmissionsRevealed
                        ? t('cah.revealed_answers_title')
                        : t('cah.cards_on_table_title')
                      : t('cah.all_revealed_answers_title')}
                  </span>
                  {gameState.state === 'JUDGING' && (
                    <span className="text-xs font-mono text-gray-400">
                      {t('cah.revealed_progress', {
                        current: gameState.revealedSubmissionsCount || 0,
                        total: gameState.totalExpectedSubmissions,
                      })}
                    </span>
                  )}
                </div>

                {/* Grid de Cartas Submetidas */}
                <div className="flex flex-wrap gap-5 justify-center items-center max-w-5xl">
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
                          if (isCzar) {
                            revealSubmission(sub.submissionId);
                          }
                        } else if (allRevealed && isCzar) {
                          setCzarSelectedSubId(sub.submissionId);
                        }
                      };

                      return (
                        <div key={sub.submissionId} className="flex flex-col items-center gap-3">
                          <div
                            className={`flex gap-3 p-3 rounded-3xl border-2 transition-all ${
                              isSelected
                                ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_35px_rgba(168,85,247,0.4)]'
                                : isRevealed
                                ? 'bg-white/5 border-white/10'
                                : 'bg-black/40 border-white/10'
                            }`}
                          >
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

                          {/* Botão de Escolher Vencedor - Apenas após todas as cartas serem reveladas */}
                          {isCzar && allRevealed && isSelected && (
                            <motion.button
                              initial={{ scale: 0.85, opacity: 0, y: -5 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => selectWinner(sub.submissionId)}
                              className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.7)] border-2 border-white transition active:scale-95 cursor-pointer flex items-center gap-2"
                            >
                              <span>👑</span>
                              <span>
                                {cardsCount > 1
                                  ? t('cah.choose_winner_multi', { count: cardsCount })
                                  : t('cah.choose_winner_single')}
                              </span>
                            </motion.button>
                          )}
                        </div>
                      );
                    })}

                  {gameState.state === 'ROUND_REVEAL' &&
                    gameState.allRevealedSubmissions?.map((sub, idx) => {
                      const cards = sub.cards && sub.cards.length > 0 ? sub.cards : [{ id: sub.cardId, text: sub.text }];
                      return (
                        <div key={sub.submissionId || sub.cardId || `${sub.playerId}_${idx}`} className="flex flex-col items-center">
                          {cards.length > 1 ? (
                            <div
                              className={`flex gap-2 p-2.5 rounded-2xl border-2 ${
                                sub.isWinner
                                  ? 'bg-amber-400/20 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.5)] scale-105'
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              {cards.map((c, i) => (
                                <WhiteCardView
                                  key={c.id || i}
                                  card={c}
                                  selectionBadge={`[${i + 1}]`}
                                  isWinner={sub.isWinner}
                                  authorName={i === cards.length - 1 ? sub.playerName : undefined}
                                  disabled
                                />
                              ))}
                            </div>
                          ) : (
                            <WhiteCardView
                              card={cards[0]}
                              isWinner={sub.isWinner}
                              authorName={sub.playerName}
                              disabled
                            />
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* BOTÃO ÚNICO E BEM VISÍVEL PARA AVANÇAR RODADA (QUANDO MODAL MINIMIZADO) */}
                {gameState.state === 'ROUND_REVEAL' && !showWinnerModal && (
                  <div className="w-full flex justify-center mt-6">
                    {isCzar || isLeader ? (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={nextRound}
                        className="px-12 py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-lg uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(251,191,36,0.6)] border-2 border-white transition-all flex items-center gap-3 cursor-pointer"
                      >
                        <span>{t('cah.advance_next_round')}</span>
                        <span className="text-2xl font-black">➔</span>
                      </motion.button>
                    ) : (
                      <div className="px-6 py-3 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-amber-300 font-medium text-sm">
                        ⏳ {t('cah.waiting_czar_advance', { name: gameState.czarName ? `(${gameState.czarName})` : '' })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BASE: MÃO DE CARTAS BRANCAS DO JOGADOR (NA FASE DE SELEÇÃO) */}
            {gameState.state === 'SELECTING_ANSWERS' && (
              <div className="flex flex-col items-center gap-4 mt-auto">
                <div className="flex justify-between items-center w-full max-w-5xl px-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black uppercase tracking-wider text-gray-200">
                      {t('cah.your_hand')}
                    </span>
                    {isCzar ? (
                      <span className="text-xs text-amber-400 font-bold italic">
                        {t('cah.czar_no_play')}
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-mono font-bold text-amber-300 border border-white/10">
                        {requiredPick > 1
                          ? t('cah.select_cards_order', {
                              count: requiredPick,
                              current: selectedCardIds.length,
                              total: requiredPick,
                            })
                          : t('cah.select_one_card', { current: selectedCardIds.length })}
                      </span>
                    )}
                  </div>

                  {!isCzar && !gameState.hasSubmitted && selectedCardIds.length === requiredPick && (
                    <motion.button
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={() => submitAnswer(selectedCardIds)}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xl transition active:scale-95 cursor-pointer"
                    >
                      {requiredPick > 1
                        ? t('cah.confirm_multi_answers', { count: requiredPick })
                        : t('cah.confirm_answer')}
                    </motion.button>
                  )}
                </div>

                {/* Leque Horizontal com as 10 Cartas Brancas */}
                <div className="w-full overflow-x-auto pb-4 pt-2">
                  <div className="flex gap-3 justify-start md:justify-center min-w-max px-4">
                    {myHand.map((card) => {
                      const selIndex = selectedCardIds.indexOf(card.id);
                      const isSelected = selIndex !== -1;
                      const badge = isSelected
                        ? requiredPick > 1
                          ? `[${selIndex + 1}] ${selIndex + 1}ª`
                          : '✓'
                        : null;
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
            )}
          </div>
        )}

        {/* 3. FASE FINAL: GAME OVER / CAMPEÃO */}
        {gameState.state === 'GAME_OVER' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-2xl mx-auto my-auto text-center p-8 bg-black/90 border-4 border-amber-400 rounded-3xl shadow-[0_0_80px_rgba(251,191,36,0.3)] backdrop-blur-2xl"
          >
            <div className="text-7xl mb-3">👑</div>
            <h2 className="text-4xl md:text-5xl font-black text-amber-400 mb-2">
              {t('cah.champion_title')}
            </h2>
            <p className="text-gray-300 text-base mb-6">
              {t('cah.champion_desc', { points: gameState.scoreToWin })}
            </p>

            {/* Placar Final */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 max-w-md mx-auto space-y-3">
              <span className="text-xs uppercase font-mono tracking-widest text-gray-400 block mb-2">
                {t('cah.final_scoreboard')}
              </span>
              {Object.entries(gameState.scores)
                .sort(([, a], [, b]) => b - a)
                .map(([pid, score], idx) => {
                  const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                  return (
                    <div
                      key={pid}
                      className={`flex justify-between items-center p-3 rounded-xl border ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black border-white scale-105'
                          : 'bg-black/40 text-gray-200 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-black">#{idx + 1}</span>
                        <span>{pName}</span>
                      </div>
                      <span className="font-black text-base">{score} {t('common.pts')}</span>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={restartGame}
              className="px-10 py-4 bg-white hover:bg-gray-200 text-slate-950 font-black text-sm uppercase tracking-widest rounded-xl shadow-2xl transition active:scale-95 cursor-pointer"
            >
              {t('cah.play_again')}
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
