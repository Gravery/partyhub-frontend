import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageSelector } from '../components/LanguageSelector';
import { DndContext, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

function SortableCard({ 
  id, 
  position,
  description, 
  ownerId, 
  ownerName,
  isRevealing, 
  secretValue, 
  revealDelay, 
  isOwner, 
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
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id,
    disabled: isLockedByOther,
    animateLayoutChanges: () => false // Deixa o Framer Motion gerenciar as trocas animadas
  });
  
  // Efeito de inclinação 3D
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

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
    <div ref={setNodeRef} style={dndStyle} {...attributes} {...listeners}>
      <motion.div 
        ref={cardRef}
        layout={!isDragging}
        layoutId={`card-layout-${id}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ 
          scale: isDragging ? 1.12 : 1, 
          rotateZ: isDragging ? 4 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`relative w-48 h-72 group perspective-[1000px] select-none ${
          isLockedByOther ? 'cursor-not-allowed opacity-85' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="relative w-full h-full" style={{ transformStyle: "preserve-3d" }}>
          
          {/* Badge de Posição na Sequência durante a Ordenação */}
          {position && !isRevealing && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 border border-purple-300/80 rounded-full text-white font-mono font-black text-xs shadow-[0_0_15px_rgba(168,85,247,0.6)] z-30 whitespace-nowrap">
              {t('common.position', 'Posição')} #{position}
            </div>
          )}

          {/* Overlay de Bloqueio em Tempo Real quando outro jogador está arrastando a carta */}
          {isLockedByOther && (
            <div className="absolute inset-0 bg-black/75 rounded-2xl flex flex-col items-center justify-center p-3 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)] z-40 pointer-events-none animate-pulse">
              <span className="text-3xl mb-1">✋</span>
              <p className="text-xs font-black text-amber-300 text-center tracking-wider uppercase drop-shadow">
                {lockedByName || t('common.player', 'Jogador')}
              </p>
              <p className="text-[11px] text-amber-200/90 text-center font-medium mt-0.5">
                {t('itto.is_moving_card', 'está movendo esta carta')}
              </p>
            </div>
          )}

          {/* Verso da Carta / Descrição da Pista */}
          <motion.div 
            animate={{ rotateY: isRevealing ? -180 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: revealDelay || 0 }}
            className={`absolute inset-0 flex flex-col p-4 rounded-2xl transition-colors
              ${isDragging 
                ? 'bg-purple-950 border-4 border-purple-500 shadow-[0_20px_50px_rgba(168,85,247,0.6)]' 
                : 'bg-black/90 border-2 border-white/20 group-hover:border-purple-400 shadow-xl'
              }`} 
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="flex items-center justify-between w-full mb-2 bg-black/60 px-2 py-1 rounded border border-white/10 text-xs">
              <span className={`truncate tracking-wider font-bold ${isOwner ? 'text-emerald-400' : 'text-purple-300'}`}>
                {isOwner ? t('itto.your_card', 'SUA CARTA') : (ownerName || `${t('common.player', 'Jogador')} ${ownerId.substring(0, 4)}`)}
              </span>
              {isOwner && knownSecret && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded font-black font-mono shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  #{knownSecret}
                </span>
              )}
            </div>
            <div className="flex-grow flex items-center justify-center p-2">
              <p className="text-sm text-center text-white font-medium drop-shadow-md leading-snug break-words">
                {description || "..."}
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 rounded-2xl pointer-events-none" />
          </motion.div>

          {/* Frente da Carta / Número Revelado (Perfeitamente Centralizado com Suspense) */}
          <motion.div 
            initial={{ rotateY: 180 }}
            animate={{ rotateY: isRevealing ? 0 : 180 }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: revealDelay || 0 }}
            className={`absolute inset-0 flex flex-col items-center justify-between rounded-2xl border-4 transition-colors p-3
              ${isRevealing 
                ? 'bg-blue-900 border-blue-400 shadow-2xl' 
                : 'bg-blue-950 border-blue-400 shadow-xl'
              }`}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="w-full bg-blue-950/95 py-1 text-xs text-center text-blue-200 font-bold rounded-lg border border-blue-700/60">
              {isOwner ? 'SUA CARTA' : (ownerName || `Jogador ${ownerId.substring(0, 4)}`)}
            </div>

            <div className="flex-1 flex items-center justify-center my-auto">
              <div className="text-7xl font-black text-white tracking-wider neon-text-shadow drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]">
                {secretValue ?? '?'}
              </div>
            </div>

            <p className="text-xs text-blue-200 text-center px-2 py-1.5 rounded-lg bg-black/60 border border-blue-500/20 w-full truncate font-medium">
              {description}
            </p>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20 rounded-2xl pointer-events-none" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Confetti leve de celebração
function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-8 rounded-sm bg-green-400"
          initial={{ 
            x: "50vw", y: "50vh", 
            scale: 0, opacity: 1, 
            rotate: Math.random() * 360 
          }}
          animate={{
            x: `${Math.random() * 100}vw`,
            y: `${100 + Math.random() * 20}vh`,
            scale: Math.random() * 1.5 + 0.5,
            opacity: 0,
            rotate: Math.random() * 720
          }}
          transition={{ duration: 2.5 + Math.random() * 2, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function IttoGameRoom() {
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
    sendMessage, 
    sendCursorMove,
    roundResult, 
    secretCards,
    disconnectNotice,
    cursors,
  } = useGameStore();

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleCopyInvite = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDescSubmit = (cardID: string) => {
    const text = inputs[cardID];
    if (text?.trim()) {
      sendMessage('SUBMIT_DESCRIPTION', { cardID, text: text.trim() });
    }
  };
  
  useEffect(() => {
    if (!session?.access_token || !roomId) {
      navigate('/hub'); 
      return;
    }
    connect('itto', roomId, session.access_token);
    return () => disconnect();
  }, [roomId, session]);

  // Limpa as caixas de texto ao mudar de nível ou retornar ao Lobby
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

  // Transmissão de posição do cursor do mouse sobre a mesa
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
    // Garante que se o arraste for cancelado, a trava é liberada
    if (gameState?.tableOrder) {
      gameState.tableOrder.forEach(id => sendMessage('UNLOCK_CARD', id));
    }
  };

  // Se não estiver conectado e não tiver estado prévio em cache
  if (!isConnected && !gameState && !isReconnecting) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#020617] text-purple-400 gap-4">
        <div className="animate-spin text-4xl">🎲</div>
        <p className="font-semibold text-lg">{t('common.entering_room', { roomId })}</p>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#020617] text-purple-400 gap-4">
        <div className="animate-spin text-4xl">⌛</div>
        <p className="font-semibold text-lg">{t('common.waiting_room_data', 'Aguardando dados da sala...')}</p>
      </div>
    );
  }

  // Cores da vinheta de fundo
  const vignetteColor = 
    gameState.state === 'REVEALING' && roundResult?.win === false ? 'rgba(239, 68, 68, 0.4)' :
    gameState.state === 'REVEALING' && roundResult?.win === true ? 'rgba(34, 197, 94, 0.3)' :
    gameState.state === 'SORTING' ? 'rgba(220, 38, 38, 0.15)' :
    'rgba(147, 51, 234, 0.1)';

  return (
    <motion.div 
      className="relative min-h-screen bg-[#020617] text-white p-6 md:p-8 font-sans overflow-x-hidden"
      animate={{ 
        x: (gameState.state === 'REVEALING' && roundResult && !roundResult.win) ? [-15, 15, -15, 15, 0] : 0 
      }}
      transition={{ duration: 0.5, type: "spring", stiffness: 500 }}
    >
      <div className="crt-overlay" />
      
      {/* Luz ambiente da vinheta */}
      <motion.div 
        className="fixed inset-0 pointer-events-none mix-blend-screen"
        animate={{ boxShadow: `inset 0 0 150px ${vignetteColor}` }}
        transition={{ duration: 2 }}
      />

      {/* Confetti na vitória */}
      {gameState.state === 'REVEALING' && roundResult?.win && <Confetti />}

      {/* Banner de Reconexão do próprio jogador */}
      {isReconnecting && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 bg-amber-950/95 border-b border-amber-500/50 p-3 z-50 flex items-center justify-center gap-4 text-amber-200 text-sm shadow-xl backdrop-blur-md"
        >
          <span className="animate-spin text-base">⏳</span>
          <span>{t('common.reconnecting', { attempt: reconnectAttempt })}</span>
          <button 
            onClick={manualReconnect}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded transition-all active:scale-95"
          >
            {t('common.reconnect_now')}
          </button>
        </motion.div>
      )}

      {/* Banner de Espera quando outro jogador desconecta */}
      {disconnectNotice && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-14 left-1/2 -translate-x-1/2 bg-red-950/95 border border-red-500/70 p-4 rounded-xl z-50 flex items-center gap-4 text-red-200 text-sm shadow-2xl backdrop-blur-md max-w-lg"
        >
          <span className="text-2xl animate-pulse">⚠️</span>
          <div>
            <p className="font-bold text-white">{t('common.player_disconnected_wait', { name: disconnectNotice.userName })}</p>
            <p className="text-xs text-red-300 mt-0.5">{t('common.match_paused')}</p>
          </div>
        </motion.div>
      )}

      {/* Mensagem de Erro / Regra */}
      {errorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 right-4 bg-red-950/95 border border-red-500 text-red-200 p-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] z-50 cursor-pointer font-medium max-w-md" 
          onClick={clearError}
        >
          <div className="flex items-center justify-between gap-3">
            <span><strong>{t('common.attention')}:</strong> {errorMsg}</span>
            <span className="text-red-400 hover:text-white text-xs underline">{t('common.close')}</span>
          </div>
        </motion.div>
      )}

      {/* Cabeçalho Limpo e sem Sobreposição */}
      <header className="relative z-10 mb-8 flex flex-col md:flex-row justify-between items-center border-b-2 border-purple-900/50 pb-4 gap-4">
        <div className="flex flex-col md:flex-row items-center md:items-baseline gap-4">
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-600 neon-text-shadow">
            ITTO
          </h1>
          <div className="flex items-center gap-3 flex-wrap font-mono text-sm uppercase tracking-wider">
            <span className="text-gray-400">
              {t('common.room')}: <span className="text-purple-300 font-bold">{roomId}</span>
            </span>
            <button
              onClick={handleCopyInvite}
              className="px-2.5 py-1 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-300 rounded font-mono text-xs uppercase tracking-wider transition-all hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] active:scale-95"
            >
              {copied ? t('common.copied') : t('common.copy_invite')}
            </button>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">
              {t('common.level')}: <span className="text-fuchsia-400 font-bold">{gameState.level}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <LanguageSelector />
          <div className="flex flex-col items-center md:items-end">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-medium">{t('common.connected_players')}</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {gameState.players.map((p: string) => {
                const isOnline = gameState.playerConnected?.[p] !== false;
                return (
                  <span 
                    key={p} 
                    className={`px-2.5 py-1 text-xs rounded border font-medium transition-colors ${
                      isOnline 
                        ? 'bg-green-950/50 border-green-500/30 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                        : 'bg-red-950/50 border-red-500/40 text-red-400 animate-pulse'
                    }`}
                  >
                    {gameState.playerNames?.[p] || p.substring(0, 6)}
                    {!isOnline && ` ${t('common.disconnected')}`}
                  </span>
                );
              })}
            </div>
          </div>

          <button 
            onClick={() => { disconnect(); navigate('/hub'); }}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/80 border border-red-500/50 text-red-400 font-semibold text-xs uppercase tracking-wider rounded-lg transition-all hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] whitespace-nowrap"
          >
            {t('common.exit_room')}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[60vh]">
        
        {/* FASE 1: LOBBY */}
        {gameState.state === 'LOBBY' && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}
            className="text-center space-y-8 w-full max-w-2xl"
          >
            <div>
              <h2 className="text-3xl font-black text-purple-200 tracking-wide mb-2">{t('itto.lobby_title')}</h2>
              <p className="text-gray-400 text-sm">
                {t('itto.lobby_desc')}
              </p>
            </div>
            
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-left space-y-4 shadow-xl">
              {gameState.players.map((pid: string) => {
                const isReady = gameState.playerReady?.[pid];
                const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                const isMe = pid === session?.user?.id;
                return (
                  <div key={pid} className="flex justify-between items-center bg-black/60 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                      <span className={`font-medium ${isMe ? 'text-green-400 font-bold' : 'text-purple-200'}`}>
                        {pName} {isMe && t('common.you')}
                      </span>
                    </div>

                    {isMe ? (
                      <button 
                        onClick={() => sendMessage('TOGGLE_READY_LOBBY')}
                        className={`px-5 py-2 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                          isReady 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30 border border-emerald-400' 
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600'
                        }`}
                      >
                        <span>{isReady ? '✓' : '👍'}</span>
                        <span>{isReady ? t('itto.ready') : t('itto.not_ready')}</span>
                      </button>
                    ) : (
                      <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                        isReady 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse'
                      }`}>
                        {isReady ? t('itto.is_ready') : t('itto.waiting')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {gameState.players[0] === session?.user?.id && (
              <div className="flex flex-col items-center gap-3 pt-4">
                <motion.button 
                  onClick={() => sendMessage('START_GAME')} 
                  disabled={!gameState.players.every((p: string) => gameState.playerReady?.[p]) || gameState.players.length < 2}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 border-2 border-purple-300 rounded-2xl font-black tracking-wider text-xl transition-all shadow-2xl relative overflow-hidden group disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  <span className="relative z-10">
                    {t('itto.start_game')} ({t('common.level')} {gameState.level})
                  </span>
                </motion.button>
                {gameState.players.length < 2 && (
                  <p className="text-xs text-amber-400 font-medium">{t('itto.min_players_warn')}</p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* FASE 2: ESCRITA DA PISTA (WRITING) */}
        {gameState.state === 'WRITING' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center w-full max-w-5xl">
            
            {/* Banner do Tema com Limiares sem quebra de setas */}
            <div className="mb-12 max-w-4xl mx-auto">
              {gameState.theme?.category && (
                <div className="mb-3">
                  <span className="px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full text-xs font-semibold uppercase tracking-wider">
                    {t('itto.category_label', { category: gameState.theme.category.replace('_', ' ') })}
                  </span>
                </div>
              )}
              <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-500 mb-6 uppercase tracking-wide drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                {gameState.theme?.title}
              </h2>
              
              <div className="flex items-center justify-center gap-3 md:gap-6 text-sm md:text-base font-semibold w-full">
                <div className="bg-black/70 px-4 py-3 rounded-xl border border-red-500/40 text-red-300 flex-1 text-center shadow-lg">
                  <span className="block text-[10px] text-red-400/80 uppercase font-mono tracking-widest mb-1">{t('itto.min_extreme')}</span>
                  {gameState.theme?.min_label}
                </div>
                
                <div className="flex items-center gap-1.5 text-fuchsia-400 font-mono text-xs uppercase tracking-widest whitespace-nowrap shrink-0 px-3 py-2 bg-fuchsia-950/40 rounded-full border border-fuchsia-500/30 shadow-md">
                  <span>◀</span>
                  <span>{t('itto.spectrum')}</span>
                  <span>▶</span>
                </div>

                <div className="bg-black/70 px-4 py-3 rounded-xl border border-purple-500/40 text-purple-300 flex-1 text-center shadow-lg">
                  <span className="block text-[10px] text-purple-400/80 uppercase font-mono tracking-widest mb-1">{t('itto.max_extreme')}</span>
                  {gameState.theme?.max_label}
                </div>
              </div>
            </div>

            {/* Painel HUD: Progresso das Pistas dos Jogadores */}
            <div className="max-w-3xl mx-auto mb-10 bg-black/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
                  <span>📝</span> {t('itto.clues_group_progress')}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  {t('itto.clues_sent_progress', {
                    current: Object.values(gameState.publicHands).filter((c) => c.description !== "").length,
                    total: Object.keys(gameState.publicHands).length
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {gameState.players.map((pid) => {
                  const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                  const pCards = Object.values(gameState.publicHands).filter((c) => c.owner_id === pid);
                  const finishedCards = pCards.filter((c) => c.description !== "").length;
                  const isDone = pCards.length > 0 && finishedCards === pCards.length;
                  const isMe = pid === session?.user?.id;

                  return (
                    <div
                      key={pid}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                        isDone
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-black/40 border-white/10 text-gray-300'
                      }`}
                    >
                      <span className="font-bold truncate max-w-[110px]">
                        {pName} {isMe && t('common.you')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-gray-400">
                          {finishedCards}/{pCards.length}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse'
                          }`}
                        >
                          {isDone ? t('itto.is_ready_badge') : t('itto.writing_badge')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suas Cartas para Escrever */}
            <div className="flex flex-wrap justify-center gap-12 mt-4">
              {Object.entries(secretCards).map(([cardID, secretValue]) => {
                const publicCardData = gameState.publicHands[cardID];
                const isSubmitted = publicCardData && publicCardData.description !== "";
                const cardNumber = parseInt(cardID.split('_').pop() || '0') + 1; 

                return (
                  <motion.div 
                    key={cardID} 
                    className="flex flex-col items-center"
                    animate={{ y: isSubmitted ? 0 : [-8, 8, -8] }}
                    transition={isSubmitted ? {} : { repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    <motion.div 
                      className={`relative w-56 h-80 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 
                        ${isSubmitted ? 'bg-gray-900 border-4 border-emerald-500 opacity-70' : 'bg-black/80 border-4 border-purple-500 backdrop-blur-md'}`}
                      animate={isSubmitted ? { rotateY: 360, scale: 0.95 } : { rotateY: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-purple-300 text-xs font-mono font-bold border border-purple-500/50">
                        {t('itto.card_num', { num: cardNumber })}
                      </div>
                      <div className={`text-8xl font-black ${isSubmitted ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'text-purple-400 neon-text-shadow'}`}>
                        {secretValue}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-2xl" />
                    </motion.div>

                    <div className="mt-8 w-full max-w-xs">
                      {isSubmitted ? (
                        <div className="flex flex-col gap-3">
                          <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} 
                            className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/50 py-2.5 rounded-xl tracking-wider text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] text-center"
                          >
                            {t('itto.clue_sent_badge')}
                          </motion.div>
                          <button 
                            onClick={() => sendMessage('UNSUBMIT_DESCRIPTION', { cardID })}
                            className="text-xs text-purple-400 hover:text-white underline underline-offset-2 font-medium tracking-wider text-center uppercase"
                          >
                            {t('itto.edit_clue_btn')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <input 
                            type="text" 
                            placeholder={t('itto.clue_input_placeholder')} 
                            value={inputs[cardID] || ''} 
                            onChange={(e) => setInputs({...inputs, [cardID]: e.target.value})} 
                            onKeyDown={(e) => e.key === 'Enter' && handleDescSubmit(cardID)} 
                            className="w-full bg-black/80 border-2 border-gray-700 rounded-xl p-3.5 text-center text-base focus:border-purple-400 outline-none focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all placeholder:text-gray-600 font-medium" 
                          />
                          <p className="text-[11px] text-gray-500 italic text-center">{t('itto.no_numbers_rule')}</p>
                          <motion.button 
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                            onClick={() => handleDescSubmit(cardID)} 
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 font-black tracking-wider uppercase rounded-xl transition shadow-[0_0_15px_rgba(147,51,234,0.4)] text-sm"
                          >
                            {t('itto.confirm_clue_btn')}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* FASE 3: ORDENAÇÃO DAS CARTAS (SORTING) */}
        {gameState.state === 'SORTING' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-6xl flex flex-col items-center">
            
            {/* Cabeçalho de Ordenação */}
            <div className="w-full max-w-5xl mb-6">
              <div className="text-center mb-4">
                {gameState.theme?.category && (
                  <span className="px-3 py-0.5 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-full text-xs font-semibold uppercase tracking-wider inline-block mb-2">
                    {t('itto.category_label', { category: gameState.theme.category.replace('_', ' ') })}
                  </span>
                )}
                <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-purple-500 tracking-wide">
                  {gameState.theme?.title || t('itto.sort_ascending_title')}
                </h2>
              </div>

              <div className="flex items-center justify-between gap-4 w-full bg-black/60 p-4 rounded-xl border border-white/10 text-xs md:text-sm font-semibold tracking-wide">
                <div className="text-red-400 flex items-center gap-1.5 whitespace-nowrap">
                  <span className="font-mono font-black text-sm">◀ 1:</span>
                  <span className="truncate max-w-[200px] md:max-w-xs">{gameState.theme?.min_label}</span>
                </div>
                <span className="text-purple-400/60 font-mono text-xs uppercase tracking-widest whitespace-nowrap hidden sm:inline">
                  {t('itto.ascending_order')}
                </span>
                <div className="text-purple-300 flex items-center gap-1.5 whitespace-nowrap text-right">
                  <span className="truncate max-w-[200px] md:max-w-xs">{gameState.theme?.max_label}</span>
                  <span className="font-mono font-black text-sm">: 100 ▶</span>
                </div>
              </div>
            </div>
             
            {/* Mesa com DndContext, Cursores ao Vivo e Trava de Cartas */}
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
                  className="relative flex justify-center flex-wrap gap-6 min-h-[340px] p-10 bg-black/40 rounded-3xl border-2 border-gray-800 w-full shadow-2xl bg-grid-pattern overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />

                  {/* Cursores dos Outros Jogadores ao Vivo */}
                  {Object.entries(cursors).map(([uid, cursor]) => {
                    if (uid === session?.user?.id) return null;
                    return (
                      <motion.div
                        key={uid}
                        className="absolute pointer-events-none z-50 transition-all duration-75 ease-out"
                        style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                          <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill={cursor.color} stroke="white" strokeWidth="1.5" />
                        </svg>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md whitespace-nowrap ml-3 -mt-2 block"
                          style={{ backgroundColor: cursor.color }}
                        >
                          {cursor.name}
                        </span>
                      </motion.div>
                    );
                  })}

                  {gameState.tableOrder.map((id: string, index: number) => {
                    const card = gameState.publicHands[id];
                    const isLockedByOther = Boolean(card?.locked_by && card.locked_by !== session?.user?.id);
                    return (
                      <SortableCard 
                        key={id} 
                        id={id} 
                        position={index + 1}
                        description={card?.description || ''} 
                        ownerId={card?.owner_id || ''}
                        ownerName={gameState.playerNames?.[card?.owner_id || '']}
                        isOwner={card?.owner_id === session?.user?.id}
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
             
            {/* Controles de Concordância e Finalização */}
            <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-4xl">
              <div className="flex flex-wrap gap-4 justify-center">
                {gameState.players.map((pid: string) => {
                  const isSorted = gameState.playerSorted?.[pid];
                  const pName = gameState.playerNames?.[pid] || pid.substring(0, 6);
                  const isMe = pid === session?.user?.id;
                  
                  if (isMe) {
                    return (
                      <button 
                        key={pid}
                        onClick={() => sendMessage('TOGGLE_READY_SORT')}
                        className={`px-8 py-3.5 font-bold tracking-wider uppercase rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                          isSorted 
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/40 border border-emerald-400' 
                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/40 border border-amber-400'
                        }`}
                      >
                        <span>{isSorted ? '✓' : '🔒'}</span>
                        <span>{isSorted ? t('itto.you_agreed') : t('itto.agree_order')}</span>
                      </button>
                    );
                  } else {
                    return (
                      <div key={pid} className="px-5 py-3 bg-black/60 rounded-xl border border-white/10 flex items-center gap-3">
                        <span className="font-medium text-gray-300">{pName}</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isSorted ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                          {isSorted ? t('itto.agreed_badge') : t('itto.analyzing_badge')}
                        </span>
                      </div>
                    );
                  }
                })}
              </div>

              <p className="text-xs text-gray-500 text-center">
                {t('itto.sorting_hint')}
              </p>

              {gameState.players[0] === session?.user?.id && (
                <motion.button 
                  onClick={() => sendMessage('FINISH_SORTING')} 
                  disabled={!gameState.players.every((p: string) => gameState.playerSorted?.[p])}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="px-12 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-500 rounded-2xl font-black tracking-wider text-lg transition-all shadow-[0_0_30px_rgba(192,38,211,0.5)] border border-fuchsia-400 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed mt-2"
                >
                  {t('itto.reveal_result_btn')}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* FASE 4: REVELAÇÃO E RESULTADO (REVEALING) */}
        {gameState.state === 'REVEALING' && (
          <div className="text-center w-full max-w-6xl">
            <motion.h2 
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}
              className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-12 tracking-wide drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]"
            >
              {t('itto.cards_reveal_heading')}
            </motion.h2>
            
            <div className="flex justify-center flex-wrap gap-6 mb-16">
              <AnimatePresence>
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
                      revealDelay={index * 0.9}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {roundResult && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, y: 50 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                transition={{ type: "spring", delay: gameState.tableOrder.length * 0.9 + 0.5 }}
                className={`p-10 rounded-3xl border-4 backdrop-blur-xl max-w-3xl mx-auto ${
                  roundResult.win 
                    ? 'bg-green-950/80 border-emerald-400 shadow-[0_0_90px_rgba(16,185,129,0.4)]' 
                    : 'bg-red-950/80 border-red-600 shadow-[0_0_90px_rgba(239,68,68,0.4)]'
                }`}
              >
                <h3 className={`text-4xl md:text-6xl font-black mb-4 tracking-wide ${
                  roundResult.win ? 'text-emerald-400' : 'text-red-500'
                }`}>
                  {roundResult.win ? t('itto.victory_title') : t('itto.defeat_title')}
                </h3>
                <p className="text-xl mb-8 text-gray-200 font-medium">{roundResult.msg}</p>
                
                {!roundResult.win ? (
                  <motion.button 
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage('RESTART_GAME')} 
                    className="px-8 py-4 bg-red-600 hover:bg-red-500 border-2 border-red-400 rounded-xl font-bold tracking-wider text-lg shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
                  >
                    {t('itto.play_again')}
                  </motion.button>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      onClick={() => sendMessage('ADVANCE_ROUND')} 
                      className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border-2 border-emerald-300 text-white font-black text-xl tracking-wider uppercase rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all flex items-center gap-3 active:scale-95"
                    >
                      <span>{t('itto.advance_level', { level: roundResult.nextLevel || (gameState.level + 1) })}</span>
                      <span>➔</span>
                    </motion.button>
                    <span className="text-xs text-emerald-300/80 font-mono uppercase tracking-wider">
                      {t('itto.advance_hint')}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </main>
    </motion.div>
  );
}