import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/useGameStore';
import { ittoAudio } from '../lib/audioEngine';
import { useAuthStore } from '../store/useAuthStore';
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
} from '../components/game/ui';
import { DndContext, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, Sparkles, Hand, MousePointer2, Check, Pencil, Send, ArrowRight, RotateCcw, Eye } from 'lucide-react';
import { CustomThemeModal } from '../components/game/CustomThemeModal';

// Tamanho de carta que cresce com a tela (antes travava em 140px)
const CARD_SIZE = 'w-[clamp(112px,11vw,176px)] aspect-[2/3]';

function SortableCard({
  id,
  position,
  description,
  ownerName,
  isRevealing,
  secretValue,
  revealDelay,
  knownSecret,
  lockedByName,
  isLockedByOther,
}: {
  id: string;
  position?: number;
  description: string;
  ownerName?: string;
  isRevealing?: boolean;
  secretValue?: number;
  revealDelay?: number;
  knownSecret?: number;
  lockedByName?: string;
  isLockedByOther?: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isLockedByOther || isRevealing,
    animateLayoutChanges: () => false,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-80, 80], [10, -10]);
  const rotateY = useTransform(x, [-80, 80], [-10, 10]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging || isLockedByOther || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    x.set(e.clientX - (rect.left + rect.width / 2));
    y.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handlePointerLeave = () => {
    x.set(0);
    y.set(0);
  };

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div ref={setNodeRef} style={dndStyle} {...attributes} {...listeners} className="shrink-0">
      <motion.div
        ref={cardRef}
        layout={!isDragging}
        layoutId={`card-layout-${id}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        animate={{ scale: isDragging ? 1.08 : 1, rotateZ: isDragging ? 3 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`relative ${CARD_SIZE} perspective-[1000px] select-none ${
          isRevealing ? '' : isLockedByOther ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          {position && !isRevealing && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 min-h-6 inline-flex items-center bg-accent text-accent-ink rounded-full font-mono font-bold text-xs shadow z-30">
              #{position}
            </div>
          )}

          {isLockedByOther && (
            <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col items-center justify-center gap-1 p-2 border-2 border-amber-400 z-40 pointer-events-none">
              <Hand size={24} className="text-amber-300" aria-hidden="true" />
              <p className="text-xs font-bold text-amber-200 text-center truncate max-w-full">
                {lockedByName || t('common.player')}
              </p>
            </div>
          )}

          {/* Frente: pista */}
          <motion.div
            animate={{ rotateY: isRevealing ? -180 : 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut', delay: revealDelay || 0 }}
            className={`absolute inset-0 flex flex-col p-3 rounded-2xl border-2 transition-colors ${
              isDragging ? 'bg-raised border-accent' : 'bg-surface border-line-strong hover:border-accent-line'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex-1 flex items-center justify-center text-center overflow-y-auto">
              <p className="font-bold text-sm xl:text-base text-ink leading-snug line-clamp-5">“{description}”</p>
            </div>
            <div className="pt-2 border-t border-line flex justify-between items-center gap-1 text-xs text-muted shrink-0">
              <span className="truncate">{ownerName || t('common.player')}</span>
              {knownSecret && <span className="font-mono font-bold text-amber-300">{knownSecret}</span>}
            </div>
          </motion.div>

          {/* Verso: número revelado */}
          <motion.div
            initial={{ rotateY: 180 }}
            animate={{ rotateY: isRevealing ? 0 : 180 }}
            transition={{ duration: 0.8, ease: 'easeInOut', delay: revealDelay || 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 border-accent bg-[#1E0A3C]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="font-display font-bold text-5xl xl:text-6xl text-accent">{secretValue}</div>
            <div className="text-xs text-body truncate max-w-full">{ownerName}</div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function ThemeScale({ title, min, max }: { title?: string; min?: string; max?: string }) {
  return (
    // Telas estreitas: tema numa linha, extremos na de baixo (sem cortar o texto)
    <div className="w-full grid grid-cols-2 md:grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 rounded-2xl bg-surface border border-line">
      <h2 className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-1 font-display font-bold text-base md:text-xl text-ink text-center md:max-w-[40ch]">
        {title}
      </h2>
      <div className="min-w-0 md:col-start-1 md:row-start-1">
        <span className="label-caps block">1</span>
        <span className="font-bold text-sm md:text-base text-rose-200 block">{min}</span>
      </div>
      <div className="min-w-0 text-right md:col-start-3 md:row-start-1">
        <span className="label-caps block">100</span>
        <span className="font-bold text-sm md:text-base text-accent block">{max}</span>
      </div>
    </div>
  );
}

export function IttoGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { session } = useAuthStore();

  const {
    gameState,
    secretCards,
    roundResult,
    cursors,
    isReconnecting,
    reconnectAttempt,
    disconnectNotice,
    manualReconnect,
    errorMsg,
    connect,
    disconnect,
    sendMessage,
    sendCursorMove,
    clearError,
    soundEnabled,
    toggleSound,
  } = useGameStore();

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [sideTab, setSideTab] = useState<'players' | 'rules'>('players');
  const [sideOpen, setSideOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.access_token || !roomId) {
      navigate('/hub');
      return;
    }
    connect('itto', roomId, session.access_token);
    return () => disconnect();
  }, [roomId, session]);

  // Sincroniza idioma do jogo com o selecionado na interface
  useEffect(() => {
    if (gameState?.state === 'LOBBY') {
      sendMessage('SET_LANGUAGE', { language: i18n.language?.startsWith('pt') ? 'pt' : 'en' });
    }
  }, [i18n.language, gameState?.state]);

  useEffect(() => {
    if (gameState?.state === 'WRITING') {
      const initial: Record<string, string> = {};
      Object.entries(gameState.publicHands || {}).forEach(([cardID, card]) => {
        if (card.description) initial[cardID] = card.description;
      });
      setInputs(initial);
    } else if (gameState?.state === 'LOBBY') {
      setInputs({});
    }
  }, [gameState?.state, gameState?.level]);

  const openSide = (tab: 'players' | 'rules') => {
    setSideTab(tab);
    setSideOpen(true);
  };

  const handleTablePointerMove = (e: React.PointerEvent) => {
    if (!tableRef.current) return;
    const rect = tableRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sendCursorMove(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
  };

  const handleDragStart = (event: DragStartEvent) => {
    sendMessage('LOCK_CARD', event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    sendMessage('UNLOCK_CARD', active.id);
    if (over && active.id !== over.id && gameState) {
      const oldIndex = gameState.tableOrder.indexOf(active.id as string);
      const newIndex = gameState.tableOrder.indexOf(over.id as string);
      sendMessage('UPDATE_SORT_ORDER', arrayMove(gameState.tableOrder, oldIndex, newIndex));
    }
  };

  const handleDragCancel = () => {
    gameState?.tableOrder?.forEach((id) => sendMessage('UNLOCK_CARD', id));
  };

  const handleDescSubmit = (cardID: string) => {
    const desc = inputs[cardID]?.trim();
    if (!desc) return;
    ittoAudio.playClueSubmitted();
    sendMessage('SUBMIT_DESCRIPTION', { cardID, text: desc, description: desc });
  };

  if (!gameState) {
    return (
      <GameLoading
        accent="violet"
        message={isReconnecting ? t('common.reconnecting', { attempt: reconnectAttempt }) : t('common.entering_room', { roomId })}
        onRetry={isReconnecting ? manualReconnect : undefined}
      />
    );
  }

  const myId = session?.user?.id || '';
  const isLeader = gameState.players[0] === myId;
  const isLobby = gameState.state === 'LOBBY';
  const totalPlayers = gameState.players.length;
  const nameOf = (pid: string) => gameState.playerNames?.[pid] || pid.substring(0, 6);

  const hands = Object.values(gameState.publicHands || {});
  const cluesSent = hands.filter((c) => c.description).length;
  const mySubmittedAll = Object.keys(secretCards).every((id) => gameState.publicHands[id]?.description);
  const notAgreed = gameState.players.filter((p) => !gameState.playerSorted?.[p]);
  const iAgreed = Boolean(gameState.playerSorted?.[myId]);

  const lobbyPlayers: LobbyPlayer[] = gameState.players.map((pid) => ({
    id: pid,
    name: nameOf(pid),
    isMe: pid === myId,
    isHost: gameState.players[0] === pid,
    isOnline: gameState.playerConnected?.[pid] !== false,
    isReady: Boolean(gameState.playerReady?.[pid]),
  }));
  const readyCount = lobbyPlayers.filter((p) => p.isReady).length;

  // Linha de status: sempre diz o que fazer agora
  let status: React.ReactNode;
  if (isLobby) {
    status = <StatusPill tone="wait" title={t('status.waiting_room')} detail={t('lobby.ready_count', { ready: readyCount, total: totalPlayers })} />;
  } else if (gameState.state === 'WRITING') {
    status = mySubmittedAll ? (
      <StatusPill tone="wait" title={t('itto.status_waiting_clues')} detail={t('itto.clues_sent_progress', { current: cluesSent, total: hands.length })} />
    ) : (
      <StatusPill tone="turn" title={t('itto.status_write')} detail={t('itto.status_write_detail')} />
    );
  } else if (gameState.state === 'SORTING') {
    status = iAgreed ? (
      <StatusPill
        tone="wait"
        title={t('itto.status_agreed')}
        detail={notAgreed.length ? t('lobby.missing_ready', { names: notAgreed.map(nameOf).join(', ') }) : undefined}
      />
    ) : (
      <StatusPill tone="turn" title={t('itto.status_sort')} detail={t('itto.status_sort_detail')} />
    );
  } else {
    status = roundResult ? (
      <StatusPill tone={roundResult.win ? 'success' : 'danger'} title={roundResult.win ? t('itto.victory_title') : t('itto.defeat_title')} />
    ) : (
      <StatusPill tone="info" title={t('itto.cards_reveal_heading')} />
    );
  }

  const sideTabs: TabOption[] = [
    { id: 'players', label: t('game.players_count', { count: totalPlayers }), icon: <Users size={16} /> },
    { id: 'rules', label: t('game.rules'), icon: <BookOpen size={16} /> },
  ];

  const sideContent =
    sideTab === 'players' ? (
      <div className="space-y-2">
        {gameState.players.map((pid) => {
          const isReady = gameState.playerReady?.[pid];
          const agreed = gameState.playerSorted?.[pid];
          const chip = isLobby ? (
            isReady ? <span className="chip chip-success">{t('lobby.ready')}</span> : <span className="chip chip-warning">{t('lobby.waiting')}</span>
          ) : gameState.state === 'SORTING' ? (
            agreed ? <span className="chip chip-success">{t('itto.agreed_badge')}</span> : <span className="chip">{t('itto.analyzing_badge')}</span>
          ) : null;
          return (
            <PlayerRow
              key={pid}
              id={pid}
              name={nameOf(pid)}
              isMe={pid === myId}
              isHost={gameState.players[0] === pid}
              isOnline={gameState.playerConnected?.[pid] !== false}
              subtitle={t('lobby.online')}
              right={chip}
            />
          );
        })}
      </div>
    ) : (
      <RulesList
        items={[
          { title: t('itto.rule1_title'), body: t('itto.rule1_body') },
          { title: t('itto.rule2_title'), body: t('itto.rule2_body') },
          { title: t('itto.rule3_title'), body: t('itto.rule3_body') },
        ]}
      />
    );

  return (
    <GameShell
      accent="violet"
      phaseKey={gameState.state}
      showRail={!isLobby}
      side={{
        title: 'Itto',
        tabs: sideTabs,
        activeTab: sideTab,
        onTabChange: (id) => setSideTab(id as 'players' | 'rules'),
        content: sideContent,
      }}
      sideOpen={sideOpen}
      onSideClose={() => setSideOpen(false)}
      header={
        <GameHeader
          gameTitle="Itto"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => openSide('players')}
          onToggleRules={() => openSide('rules')}
          railVisible={!isLobby}
          status={status}
          stats={!isLobby ? <span className="chip chip-accent shrink-0">{t('common.level')} {gameState.level}</span> : null}
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
        gameState.state === 'SORTING' ? (
          <div className="w-full bg-surface border-t border-line px-3 md:px-6 py-3">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-muted">{t('itto.sorting_hint')}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => sendMessage('TOGGLE_READY_SORT')}
                  aria-pressed={iAgreed}
                  className={`btn ${iAgreed ? 'btn-success' : 'btn-secondary'}`}
                >
                  <Check size={18} strokeWidth={3} />
                  {iAgreed ? t('itto.agreed_badge') : t('itto.agree_order')}
                </button>
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => sendMessage('FINISH_SORTING')}
                    disabled={notAgreed.length > 0}
                    title={notAgreed.length ? t('lobby.missing_ready', { names: notAgreed.map(nameOf).join(', ') }) : undefined}
                    className="btn btn-primary"
                  >
                    <Eye size={18} />
                    {t('itto.reveal_result_btn')}
                  </button>
                )}
              </div>
            </div>
            {isLeader && notAgreed.length > 0 && (
              <p className="max-w-4xl mx-auto mt-2 text-sm text-amber-300 sm:text-right">
                {t('lobby.missing_ready', { names: notAgreed.map(nameOf).join(', ') })}
              </p>
            )}
          </div>
        ) : null
      }
      overlay={
        <CustomThemeModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          gameType="itto"
          existingCustomCount={gameState.customThemesCount || 0}
          onSaveThemes={(payload) => sendMessage(payload.type, payload)}
        />
      }
    >
      {/* 1. LOBBY */}
      {isLobby && (
        <GameLobby
          description={t('itto.lobby_desc')}
          players={lobbyPlayers}
          minPlayers={2}
          maxPlayers={8}
          isHost={isLeader}
          isReadyMe={Boolean(gameState.playerReady?.[myId])}
          onToggleReady={() => sendMessage('TOGGLE_READY_LOBBY')}
          onStart={() => sendMessage('START_GAME')}
          startBlockedReason={lobbyBlockReason(t, lobbyPlayers, 2)}
          howTo={[t('itto.howto_1'), t('itto.howto_2'), t('itto.howto_3')]}
          settings={
            <button type="button" onClick={() => setShowCustomModal(true)} className="btn btn-secondary btn-block justify-between">
              <span className="inline-flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                {t('itto.custom_themes')}
              </span>
              <span className="chip chip-accent">{gameState.customThemesCount || 0}</span>
            </button>
          }
        />
      )}

      {/* 2. ESCRITA DAS PISTAS */}
      {gameState.state === 'WRITING' && (
        <div className="w-full h-full max-w-6xl flex flex-col gap-4 min-h-0">
          <ThemeScale title={gameState.theme?.title} min={gameState.theme?.min_label} max={gameState.theme?.max_label} />

          <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center">
            <div className="flex flex-wrap justify-center gap-6 py-2">
              {Object.entries(secretCards).map(([cardID, secretValue]) => {
                const isSubmitted = Boolean(gameState.publicHands[cardID]?.description);
                const inputId = `clue-${cardID}`;

                return (
                  <div key={cardID} className="flex flex-col items-center gap-3 w-[clamp(200px,18vw,260px)]">
                    <div
                      className={`relative ${CARD_SIZE} rounded-2xl flex flex-col items-center justify-center gap-1 border-2 ${
                        isSubmitted ? 'bg-surface border-emerald-500' : 'bg-[#1E0A3C] border-accent'
                      }`}
                    >
                      <span className="label-caps">{t('itto.your_number')}</span>
                      <span className="font-display font-bold text-6xl xl:text-7xl text-accent">{secretValue}</span>
                    </div>

                    {isSubmitted ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="chip chip-success">
                          <Check size={14} strokeWidth={3} />
                          {t('itto.clue_sent_badge')}
                        </span>
                        <button type="button" onClick={() => sendMessage('UNSUBMIT_DESCRIPTION', { cardID })} className="btn btn-ghost btn-sm">
                          <Pencil size={16} />
                          {t('itto.edit_clue_btn')}
                        </button>
                      </div>
                    ) : (
                      <form
                        className="w-full flex flex-col gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleDescSubmit(cardID);
                        }}
                      >
                        <label htmlFor={inputId} className="sr-only">
                          {t('itto.clue_input_placeholder')}
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={inputId}
                            type="text"
                            placeholder={t('itto.clue_input_placeholder')}
                            value={inputs[cardID] || ''}
                            onChange={(e) => setInputs({ ...inputs, [cardID]: e.target.value })}
                            className="field text-center"
                          />
                          <button type="submit" className="icon-btn bg-accent text-accent-ink border-transparent hover:bg-accent" aria-label={t('itto.confirm_clue_btn')}>
                            <Send size={18} />
                          </button>
                        </div>
                        <span className="text-xs text-muted text-center">{t('itto.no_numbers_rule')}</span>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. ORDENAÇÃO */}
      {gameState.state === 'SORTING' && (
        <div className="w-full h-full max-w-7xl flex flex-col gap-4 min-h-0">
          <ThemeScale title={gameState.theme?.title} min={gameState.theme?.min_label} max={gameState.theme?.max_label} />

          <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <SortableContext items={gameState.tableOrder} strategy={rectSortingStrategy}>
              <div
                ref={tableRef}
                onPointerMove={handleTablePointerMove}
                className="relative flex-1 min-h-0 overflow-y-auto flex items-center justify-center flex-wrap content-center gap-4 xl:gap-5 p-5 rounded-3xl bg-surface/60 border border-line"
              >
                {Object.entries(cursors).map(([uid, cursor]) => {
                  if (uid === myId) return null;
                  return (
                    <div
                      key={uid}
                      className="absolute pointer-events-none z-50 flex items-start gap-1"
                      style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
                    >
                      <MousePointer2 size={18} style={{ color: cursor.color }} fill={cursor.color} aria-hidden="true" />
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold text-white shadow" style={{ backgroundColor: cursor.color }}>
                        {cursor.name}
                      </span>
                    </div>
                  );
                })}

                {gameState.tableOrder.map((id, index) => {
                  const card = gameState.publicHands[id];
                  return (
                    <SortableCard
                      key={id}
                      id={id}
                      position={index + 1}
                      description={card?.description || ''}
                      ownerName={gameState.playerNames?.[card?.owner_id || '']}
                      knownSecret={secretCards[id]}
                      lockedByName={card?.locked_by_name}
                      isLockedByOther={Boolean(card?.locked_by && card.locked_by !== myId)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* 4. REVELAÇÃO */}
      {gameState.state === 'REVEALING' && (
        <div className="w-full h-full max-w-7xl flex flex-col items-center gap-4 min-h-0">
          <h2 className="font-display font-bold text-2xl text-ink shrink-0">{t('itto.cards_reveal_heading')}</h2>

          <div className="flex-1 min-h-0 w-full overflow-y-auto flex items-center justify-center flex-wrap content-center gap-4 xl:gap-5 p-2">
            {gameState.tableOrder.map((id, index) => {
              const card = gameState.publicHands[id];
              return (
                <SortableCard
                  key={id}
                  id={id}
                  description={card?.description || ''}
                  ownerName={gameState.playerNames?.[card?.owner_id || '']}
                  isRevealing
                  secretValue={card?.secret_value}
                  revealDelay={index * 0.7}
                />
              );
            })}
          </div>

          <AnimatePresence>
            {roundResult && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(gameState.tableOrder.length * 0.7, 4), duration: 0.35 }}
                className={`w-full max-w-lg p-5 rounded-3xl border-2 text-center shrink-0 flex flex-col items-center gap-3 ${
                  roundResult.win ? 'bg-emerald-950 border-emerald-500' : 'bg-rose-950 border-rose-600'
                }`}
              >
                <h3 className={`font-display font-bold text-2xl ${roundResult.win ? 'text-emerald-200' : 'text-rose-200'}`}>
                  {roundResult.win ? t('itto.victory_title') : t('itto.defeat_title')}
                </h3>
                <p className="text-sm text-body">{roundResult.msg}</p>
                {roundResult.win ? (
                  <button type="button" onClick={() => sendMessage('ADVANCE_ROUND')} className="btn btn-primary btn-lg">
                    {t('itto.advance_level', { level: roundResult.nextLevel || gameState.level + 1 })}
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button type="button" onClick={() => sendMessage('RESTART_GAME')} className="btn btn-danger btn-lg">
                    <RotateCcw size={18} />
                    {t('itto.play_again')}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </GameShell>
  );
}
