import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { SideDrawer, type TabOption } from '../components/game/SideDrawer';
import { DndContext, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, History as HistoryIcon } from 'lucide-react';

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
  ownerId: string;
  ownerName?: string;
  isRevealing?: boolean;
  secretValue?: number;
  revealDelay?: number;
  isOwner?: boolean;
  knownSecret?: number;
  lockedBy?: string;
  lockedByName?: string;
  isLockedByOther?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isLockedByOther,
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
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
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
        animate={{
          scale: isDragging ? 1.08 : 1,
          rotateZ: isDragging ? 3 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`relative w-[clamp(105px,13vw,140px)] h-[clamp(155px,23dvh,210px)] aspect-[2/3] group perspective-[1000px] select-none ${
          isLockedByOther ? 'cursor-not-allowed opacity-80' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          {/* Position Badge */}
          {position && !isRevealing && (
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 border border-purple-300/80 rounded-full text-white font-mono font-black text-[10px] shadow z-30 whitespace-nowrap">
              #{position}
            </div>
          )}

          {/* Locked Overlay */}
          {isLockedByOther && (
            <div className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center p-2 border border-amber-400 z-40 pointer-events-none animate-pulse">
              <span className="text-xl mb-0.5">✋</span>
              <p className="text-[10px] font-bold text-amber-300 text-center truncate max-w-full">
                {lockedByName || 'Jogador'}
              </p>
            </div>
          )}

          {/* Front / Description */}
          <motion.div
            animate={{ rotateY: isRevealing ? -180 : 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut', delay: revealDelay || 0 }}
            className={`absolute inset-0 flex flex-col p-2.5 rounded-xl border transition-colors shadow-md ${
              isDragging
                ? 'bg-purple-900/90 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                : 'bg-slate-900 border-white/20 hover:border-purple-400'
            }`}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex-1 flex items-center justify-center text-center overflow-y-auto px-1">
              <p className="font-bold text-xs sm:text-sm text-gray-100 leading-snug line-clamp-4">
                "{description}"
              </p>
            </div>

            <div className="pt-1.5 border-t border-white/10 flex justify-between items-center text-[9px] text-gray-400 font-mono shrink-0">
              <span className="truncate max-w-[70px]">{ownerName || 'Anônimo'}</span>
              {knownSecret && <span className="text-amber-400 font-bold">({knownSecret})</span>}
            </div>
          </motion.div>

          {/* Back / Revealed Secret Value */}
          <motion.div
            initial={{ rotateY: 180 }}
            animate={{ rotateY: isRevealing ? 0 : 180 }}
            transition={{ duration: 0.8, ease: 'easeInOut', delay: revealDelay || 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-purple-400 bg-gradient-to-tr from-purple-950 via-slate-900 to-purple-900 shadow-xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-amber-200 neon-text-shadow">
              {secretValue}
            </div>
            <div className="text-[10px] text-gray-300 font-mono mt-1 truncate max-w-full">
              {ownerName}
            </div>
          </motion.div>
        </div>
      </motion.div>
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
    errorMsg,
    connect,
    disconnect,
    sendMessage,
    sendCursorMove,
    clearError,
  } = useGameStore();

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [drawerTab, setDrawerTab] = useState<'players' | 'history' | 'rules' | null>(null);
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
        if (card.description) {
          initial[cardID] = card.description;
        }
      });
      setInputs(initial);
    } else if (gameState?.state === 'LOBBY') {
      setInputs({});
    }
  }, [gameState?.state, gameState?.level]);

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
      const newOrder = arrayMove(gameState.tableOrder, oldIndex, newIndex);
      sendMessage('UPDATE_SORT_ORDER', newOrder);
    }
  };

  const handleDragCancel = () => {
    if (gameState?.tableOrder) {
      gameState.tableOrder.forEach((id) => sendMessage('UNLOCK_CARD', id));
    }
  };

  const handleDescSubmit = (cardID: string) => {
    const desc = inputs[cardID]?.trim();
    if (!desc) return;
    sendMessage('SUBMIT_DESCRIPTION', { cardID, text: desc, description: desc });
  };

  if (!gameState) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-[#020617] text-purple-400 gap-4">
        <div className="animate-spin text-4xl">🎲</div>
        <p className="font-semibold text-sm tracking-wider uppercase">
          {isReconnecting
            ? t('common.reconnecting', { attempt: reconnectAttempt })
            : t('common.entering_room', { roomId })}
        </p>
      </div>
    );
  }

  const myId = session?.user?.id || '';
  const isLeader = gameState.players[0] === myId;
  const totalPlayers = gameState.players.length;

  const drawerTabs: TabOption[] = [
    { id: 'players', label: `Jogadores (${totalPlayers})`, icon: <Users size={14} /> },
    { id: 'rules', label: 'Regras', icon: <BookOpen size={14} /> },
    { id: 'history', label: 'Histórico', icon: <HistoryIcon size={14} /> },
  ];

  return (
    <GameShell
      themeClass="bg-slate-950 text-white"
      header={
        <GameHeader
          gameTitle="ITTO"
          gameBadge="THE MIND"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          accentColor="text-purple-400"
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => setDrawerTab('players')}
          onToggleRules={() => setDrawerTab('rules')}
          onToggleLog={() => setDrawerTab('history')}
          centerContent={
            gameState.state !== 'LOBBY' ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
                  {t('common.level')} {gameState.level}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 text-xs font-bold hidden sm:inline">
                  {gameState.state === 'WRITING'
                    ? 'Escrevendo Pistas'
                    : gameState.state === 'SORTING'
                    ? 'Ordenando'
                    : 'Revelando'}
                </span>
              </div>
            ) : null
          }
        />
      }
      footer={
        /* Bottom Control Dock */
        gameState.state === 'SORTING' ? (
          <div className="w-full bg-slate-900/95 border-t border-white/10 px-3 py-2 md:py-2.5 backdrop-blur-md">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
              <div className="text-xs text-gray-300 truncate">
                {gameState.playerSorted?.[myId]
                  ? '✓ Você concordou com a ordem!'
                  : 'Debata e organize as cartas do menor para o maior!'}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => sendMessage('TOGGLE_READY_SORT')}
                  className={`px-4 py-2 font-bold text-xs uppercase rounded-xl transition cursor-pointer ${
                    gameState.playerSorted?.[myId]
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {gameState.playerSorted?.[myId] ? '✓ Concordei' : '🔒 Concordar com Ordem'}
                </button>

                {isLeader && (
                  <button
                    onClick={() => sendMessage('FINISH_SORTING')}
                    disabled={!gameState.players.every((p) => gameState.playerSorted?.[p])}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-black text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Revelar Resultado 🎯
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null
      }
      overlay={
        <>
          {/* Error Banner */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-950 border border-rose-500 text-rose-200 px-4 py-2 rounded-xl text-xs flex items-center gap-3 shadow-lg"
              >
                <span>⚠️ {errorMsg}</span>
                <button onClick={clearError} className="text-xs font-mono">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Off-canvas Side Drawer */}
          <SideDrawer
            isOpen={drawerTab !== null}
            onClose={() => setDrawerTab(null)}
            title="Itto (The Mind)"
            tabs={drawerTabs}
            activeTab={drawerTab || 'players'}
            onTabChange={(tab) => setDrawerTab(tab as any)}
          >
            {drawerTab === 'players' && (
              <div className="space-y-3">
                <span className="text-xs text-gray-400 block">Jogadores na Sala</span>
                <div className="space-y-2">
                  {gameState.players.map((pid) => {
                    const isOnline = gameState.playerConnected?.[pid] !== false;
                    const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                    const isReady = gameState.playerReady?.[pid];
                    const isMe = pid === myId;

                    return (
                      <div
                        key={pid}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isOnline
                            ? 'bg-white/5 border-white/10 text-white'
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isOnline ? 'bg-emerald-400' : 'bg-gray-600'
                            }`}
                          />
                          <span className="font-bold truncate">
                            {pName} {isMe && '(Você)'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {isReady ? 'PRONTO' : 'AGUARDANDO'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {drawerTab === 'rules' && (
              <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                <div>
                  <h4 className="font-bold text-purple-300 text-sm mb-1">O Conceito</h4>
                  <p>Cada jogador recebe cartas com números secretos de 1 a 100. Baseando-se no tema da rodada, você deve dar uma pista proporcional ao seu número.</p>
                </div>
                <div>
                  <h4 className="font-bold text-purple-300 text-sm mb-1">Ordenação Cooperativa</h4>
                  <p>Sem revelar seus números diretamente, o grupo debate as pistas e organiza as cartas em ordem crescente do menor (1) para o maior (100).</p>
                </div>
                <div>
                  <h4 className="font-bold text-purple-300 text-sm mb-1">Regra de Ouro</h4>
                  <p>Nunca mencione números diretamente nem utilize truques para revelar valores numéricos!</p>
                </div>
              </div>
            )}

            {drawerTab === 'history' && (
              <div className="space-y-2 text-xs text-gray-400">
                <p className="italic text-center py-4">Progresso do nível atual gravado.</p>
              </div>
            )}
          </SideDrawer>
        </>
      }
    >
      {/* 1. LOBBY */}
      {gameState.state === 'LOBBY' && (
        <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center my-auto">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-3xl mx-auto">
            🔮
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-purple-300">
              {t('itto.lobby_title')}
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              {t('itto.lobby_desc')}
            </p>
          </div>

          {/* Jogadores Conectados e Status de Pronto */}
          <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Jogadores Conectados ({gameState.players.length})
              </span>
              <span className="font-mono text-purple-300 text-xs font-bold">
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

          <div className="w-full flex flex-col gap-2 pt-1">
            <button
              onClick={() => sendMessage('TOGGLE_READY_LOBBY')}
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
                onClick={() => sendMessage('START_GAME')}
                disabled={
                  !gameState.players.every((p) => gameState.playerReady?.[p]) ||
                  gameState.players.length < 2
                }
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
              >
                {gameState.players.length < 2 ? 'Mínimo de 2 Jogadores' : 'Iniciar Partida 🚀'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. WRITING PHASE */}
      {gameState.state === 'WRITING' && (
        <div className="w-full max-w-3xl flex flex-col items-center justify-between h-full py-1">
          {/* Theme Banner */}
          <div className="w-full shrink-0 space-y-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs">
              <span className="text-red-400 font-bold">1: {gameState.theme?.min_label}</span>
              <span className="font-black text-sm uppercase text-amber-300">
                {gameState.theme?.title}
              </span>
              <span className="text-purple-400 font-bold">{gameState.theme?.max_label} :100</span>
            </div>
          </div>

          {/* Cards to write */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 my-2">
            <div className="flex flex-wrap justify-center gap-4">
              {Object.entries(secretCards).map(([cardID, secretValue]) => {
                const publicCardData = gameState.publicHands[cardID];
                const isSubmitted = publicCardData && publicCardData.description !== '';

                return (
                  <div key={cardID} className="flex flex-col items-center gap-2">
                    <div
                      className={`relative w-[clamp(115px,15vw,155px)] h-[clamp(165px,24dvh,220px)] aspect-[2/3] rounded-2xl flex flex-col items-center justify-center border-2 shadow-xl ${
                        isSubmitted
                          ? 'bg-slate-900 border-emerald-500'
                          : 'bg-black border-purple-500'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-purple-400 uppercase">Seu Número</span>
                      <span className="text-5xl font-black text-purple-300 neon-text-shadow">
                        {secretValue}
                      </span>
                    </div>

                    {isSubmitted ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-emerald-400 font-bold">✓ Pista Enviada!</span>
                        <button
                          onClick={() => sendMessage('UNSUBMIT_DESCRIPTION', { cardID })}
                          className="text-[10px] text-purple-400 underline uppercase"
                        >
                          Editar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 w-full max-w-[200px]">
                        <input
                          type="text"
                          placeholder="Digite sua pista..."
                          value={inputs[cardID] || ''}
                          onChange={(e) => setInputs({ ...inputs, [cardID]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleDescSubmit(cardID)}
                          className="flex-1 bg-black/60 border border-white/20 rounded-lg px-2 py-1 text-xs text-center outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={() => handleDescSubmit(cardID)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold"
                        >
                          ✓
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. SORTING PHASE */}
      {gameState.state === 'SORTING' && (
        <div className="w-full max-w-4xl flex flex-col items-center justify-between h-full py-1">
          {/* Top Theme Ribbon */}
          <div className="w-full shrink-0 flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/10 text-xs">
            <span className="text-red-400 font-bold">◀ 1: {gameState.theme?.min_label}</span>
            <span className="font-bold text-amber-300 uppercase truncate max-w-xs px-2">
              {gameState.theme?.title}
            </span>
            <span className="text-purple-400 font-bold">{gameState.theme?.max_label} :100 ▶</span>
          </div>

          {/* Center Table of Cards with DnD */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 my-2">
            <DndContext
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={gameState.tableOrder} strategy={rectSortingStrategy}>
                <div
                  ref={tableRef}
                  onPointerMove={handleTablePointerMove}
                  className="relative flex items-center justify-center flex-wrap gap-3 p-4 bg-black/40 rounded-2xl border border-white/10 w-full max-h-[55dvh] overflow-y-auto"
                >
                  {/* Live Cursors */}
                  {Object.entries(cursors).map(([uid, cursor]) => {
                    if (uid === myId) return null;
                    return (
                      <div
                        key={uid}
                        className="absolute pointer-events-none z-50"
                        style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
                      >
                        <span className="text-xs">👆</span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow"
                          style={{ backgroundColor: cursor.color }}
                        >
                          {cursor.name}
                        </span>
                      </div>
                    );
                  })}

                  {gameState.tableOrder.map((id, index) => {
                    const card = gameState.publicHands[id];
                    const isLockedByOther = Boolean(card?.locked_by && card.locked_by !== myId);
                    return (
                      <SortableCard
                        key={id}
                        id={id}
                        position={index + 1}
                        description={card?.description || ''}
                        ownerId={card?.owner_id || ''}
                        ownerName={gameState.playerNames?.[card?.owner_id || '']}
                        isOwner={card?.owner_id === myId}
                        knownSecret={secretCards[id]}
                        lockedBy={card?.locked_by}
                        lockedByName={card?.locked_by_name}
                        isLockedByOther={isLockedByOther}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {/* 4. REVEALING PHASE */}
      {gameState.state === 'REVEALING' && (
        <div className="w-full max-w-4xl flex flex-col items-center justify-between h-full py-1">
          <div className="shrink-0 text-center">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
              {t('itto.cards_reveal_heading')}
            </h3>
          </div>

          <div className="flex-1 w-full flex items-center justify-center min-h-0 my-2">
            <div className="flex items-center justify-center flex-wrap gap-3 max-h-[50dvh] overflow-y-auto p-2">
              {gameState.tableOrder.map((id, index) => {
                const card = gameState.publicHands[id];
                return (
                  <SortableCard
                    key={id}
                    id={id}
                    description={card?.description || ''}
                    ownerId={card?.owner_id || ''}
                    ownerName={gameState.playerNames?.[card?.owner_id || '']}
                    isRevealing={true}
                    secretValue={card?.secret_value}
                    revealDelay={index * 0.7}
                  />
                );
              })}
            </div>
          </div>

          {/* Result Banner */}
          {roundResult && (
            <div
              className={`w-full max-w-md p-4 rounded-2xl border text-center shadow-xl shrink-0 ${
                roundResult.win
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500 text-rose-200'
              }`}
            >
              <h4 className="text-lg font-black uppercase">
                {roundResult.win ? t('itto.victory_title') : t('itto.defeat_title')}
              </h4>
              <p className="text-xs mt-0.5">{roundResult.msg}</p>

              <div className="pt-2">
                {!roundResult.win ? (
                  <button
                    onClick={() => sendMessage('RESTART_GAME')}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase rounded-xl"
                  >
                    {t('itto.play_again')}
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage('ADVANCE_ROUND')}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow"
                  >
                    Avançar para o Nível {roundResult.nextLevel || gameState.level + 1} ➔
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}