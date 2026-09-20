import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useLudoStore,
  type LudoColor,
  type LudoPlayer,
  type LudoPawn,
  ludoAudio,
} from '../store/useLudoStore';
import { getPawnPosition } from '../lib/ludoBoard';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageSelector } from '../components/LanguageSelector';

// Cores temáticas para cada jogador
const COLOR_CONFIG: Record<
  LudoColor,
  {
    bg: string;
    border: string;
    text: string;
    shadow: string;
    glow: string;
    yardBg: string;
    nameKey: string;
  }
> = {
  RED: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    text: 'text-red-400',
    shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]',
    glow: 'from-red-500 to-rose-600',
    yardBg: 'bg-red-950/70 border-red-500/50',
    nameKey: 'ludo.color_red',
  },
  GREEN: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    text: 'text-emerald-400',
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.6)]',
    glow: 'from-emerald-500 to-teal-600',
    yardBg: 'bg-emerald-950/70 border-emerald-500/50',
    nameKey: 'ludo.color_green',
  },
  YELLOW: {
    bg: 'bg-amber-400',
    border: 'border-amber-300',
    text: 'text-amber-300',
    shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.6)]',
    glow: 'from-amber-400 to-yellow-500',
    yardBg: 'bg-amber-950/70 border-amber-500/50',
    nameKey: 'ludo.color_yellow',
  },
  BLUE: {
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    text: 'text-blue-400',
    shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]',
    glow: 'from-blue-500 to-cyan-600',
    yardBg: 'bg-blue-950/70 border-blue-500/50',
    nameKey: 'ludo.color_blue',
  },
};

// Componente do Dado Estilizado
function DiceView({
  value,
  isRolling,
  onClick,
  canRoll,
}: {
  value: number;
  isRolling: boolean;
  onClick?: () => void;
  canRoll: boolean;
}) {
  const pipsConfig: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  const activePips = pipsConfig[value] || (value > 0 ? [4] : []);

  return (
    <motion.button
      type="button"
      disabled={!canRoll}
      onClick={onClick}
      whileHover={canRoll ? { scale: 1.08 } : {}}
      whileTap={canRoll ? { scale: 0.92 } : {}}
      animate={
        isRolling
          ? {
              rotate: [0, 90, 180, 270, 360],
              scale: [1, 1.15, 0.95, 1],
            }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl p-2.5 flex items-center justify-center border-2 transition-all shadow-xl select-none ${
        canRoll
          ? 'bg-gradient-to-br from-white to-gray-200 border-amber-400 cursor-pointer shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse'
          : 'bg-gradient-to-br from-gray-800 to-gray-950 border-white/10 cursor-default opacity-85'
      }`}
    >
      {value === 0 ? (
        <span className="text-gray-500 text-2xl font-black font-mono">?</span>
      ) : (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-1">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-center">
              {activePips.includes(idx) && (
                <div
                  className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${
                    canRoll ? 'bg-slate-950' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </motion.button>
  );
}

export function LudoGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const {
    isConnected,
    isReconnecting,
    reconnectAttempt,
    gameState,
    errorMsg,
    isRollingAnimation,
    soundEnabled,
    toastMessage,
    extraTurnBanner,
    connect,
    disconnect,
    chooseColor,
    toggleBots,
    startGame,
    rollDice,
    movePawn,
    restartGame,
    toggleSound,
    clearError,
    clearToast,
  } = useLudoStore();

  useEffect(() => {
    if (roomId && session?.access_token) {
      connect(roomId, session.access_token);
    }
    return () => {
      disconnect();
    };
  }, [roomId, session, connect, disconnect]);

  // Animação passo a passo do peão andando casa por casa
  const [walkingPawn, setWalkingPawn] = useState<{
    playerId: string;
    pawnId: number;
    color: LudoColor;
    step: number;
  } | null>(null);

  const lastMoveKeyRef = useRef<string>('');

  useEffect(() => {
    const lm = gameState?.lastMove;
    if (!lm) return;
    const moveKey = `${lm.playerId}_${lm.pawnIndex}_${lm.fromStep}_${lm.toStep}_${lm.dice}`;
    if (lastMoveKeyRef.current === moveKey) return;
    lastMoveKeyRef.current = moveKey;

    if (lm.fromStep === lm.toStep) return;

    // Se saiu da garagem (fromStep === -1, toStep === 0)
    if (lm.fromStep === -1) {
      setWalkingPawn({
        playerId: lm.playerId,
        pawnId: lm.pawnIndex,
        color: lm.color,
        step: 0,
      });
      ludoAudio.playPawnHop();
      const timer = setTimeout(() => {
        setWalkingPawn(null);
      }, 300);
      return () => clearTimeout(timer);
    }

    // Se andou no tabuleiro (passo a passo de fromStep até toStep)
    let current = lm.fromStep;
    const target = lm.toStep;

    const interval = setInterval(() => {
      current++;
      ludoAudio.playPawnHop();
      setWalkingPawn({
        playerId: lm.playerId,
        pawnId: lm.pawnIndex,
        color: lm.color,
        step: current,
      });

      if (current >= target) {
        clearInterval(interval);
        setTimeout(() => {
          setWalkingPawn(null);
          if (target === 56) {
            ludoAudio.playGoal();
          }
        }, 180);
      }
    }, 140);

    return () => clearInterval(interval);
  }, [gameState?.lastMove]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 font-mono">
        <div className="animate-spin text-4xl mb-4">🎲</div>
        <p className="text-sm uppercase tracking-widest text-amber-400 animate-pulse">
          {t('common.entering_room', { roomId })}
        </p>
      </div>
    );
  }

  const myId = user?.id || '';
  const isLeader = gameState.leaderId === myId;
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer && activePlayer.id === myId;
  const canRoll = isMyTurn && gameState.state === 'WAITING_ROLL';
  const isWaitingMove = isMyTurn && gameState.state === 'WAITING_MOVE';

  // Agrupa peões por coordenada (Row, Col) para renderizar múltiplos peões na mesma casa
  const pawnsByCoord: Record<string, { pawn: LudoPawn; player: LudoPlayer }[]> = {};
  gameState.players.forEach((p) => {
    p.pawns.forEach((pawn) => {
      let pos = pawn.position;
      if (
        walkingPawn &&
        walkingPawn.playerId === p.id &&
        walkingPawn.pawnId === pawn.id
      ) {
        pos = getPawnPosition(p.color, pawn.id, walkingPawn.step);
      }
      const key = `${pos.row}_${pos.col}`;
      if (!pawnsByCoord[key]) {
        pawnsByCoord[key] = [];
      }
      pawnsByCoord[key].push({ pawn, player: p });
    });
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-3 md:p-6 overflow-x-hidden font-sans select-none">
      {/* 1. TOPO / CABEÇALHO */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/hub')}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-mono font-bold uppercase transition active:scale-95 cursor-pointer"
          >
            &larr; {t('common.back_to_hub')}
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500">
              {t('ludo.game_title')}
            </h1>
            <span className="text-xs font-mono text-gray-400">
              {t('common.room')}: <strong className="text-amber-400 font-bold">{roomId}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Alternador de Áudio */}
          <button
            onClick={toggleSound}
            title="Som FX"
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                : 'bg-white/5 border-white/10 text-gray-400'
            }`}
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span className="hidden sm:inline">SFX</span>
          </button>

          <LanguageSelector />

          {/* Status de Conexão */}
          <div className="flex items-center gap-2 px-3 py-1 bg-black/60 border border-white/10 rounded-full text-xs font-mono">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-gray-300">
              {isConnected
                ? 'LIVE'
                : isReconnecting
                ? `${t('common.reconnecting', { attempt: reconnectAttempt })}`
                : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </header>

      {/* Banner de Erro */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="my-3 px-4 py-2 bg-rose-950/80 border border-rose-500 rounded-xl text-rose-200 text-xs flex justify-between items-center"
          >
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={clearError}
              className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500/50"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de Captura / Notificação Flutuante */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="my-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs md:text-sm rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.7)] border-2 border-red-300 flex items-center justify-between gap-4 z-40 max-w-lg mx-auto"
          >
            <span>{toastMessage}</span>
            <button
              onClick={clearToast}
              className="px-2 py-0.5 rounded-lg bg-black/30 hover:bg-black/50 text-white text-xs cursor-pointer font-mono"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banner de Turno Extra (Rolou 6 ou Capturou) */}
      <AnimatePresence>
        {extraTurnBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="my-2 px-6 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs md:text-sm tracking-widest uppercase rounded-full shadow-[0_0_35px_rgba(251,191,36,0.8)] border-2 border-white flex items-center justify-center gap-2 animate-bounce z-40 max-w-md mx-auto"
          >
            <span>{extraTurnBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <main className="flex-grow flex flex-col items-center justify-center my-4 gap-6">
        {/* FASE A: LOBBY & SELEÇÃO DE COR */}
        {gameState.state === 'LOBBY' && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-xl w-full bg-black/60 backdrop-blur-xl border-2 border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6"
          >
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-black text-amber-400 uppercase tracking-widest mb-2">
                {t('ludo.lobby_title')}
              </h2>
              <p className="text-xs md:text-sm text-gray-300 leading-relaxed">
                {t('ludo.lobby_desc')}
              </p>
            </div>

            {/* Slots dos 4 Jogadores / Seleção de Cor Interativa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(['RED', 'GREEN', 'YELLOW', 'BLUE'] as LudoColor[]).map((color) => {
                const cfg = COLOR_CONFIG[color];
                const assignedPlayer = gameState.players.find((p) => p.color === color);
                const isMe = assignedPlayer && assignedPlayer.id === myId;
                const isFree = !assignedPlayer;

                return (
                  <div
                    key={color}
                    onClick={() => {
                      if (isFree && !isMe) {
                        chooseColor(color);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                      assignedPlayer
                        ? isMe
                          ? `${cfg.yardBg} ${cfg.shadow} border-amber-400 ring-2 ring-amber-400/40 scale-[1.02]`
                          : `${cfg.yardBg} border-white/20 opacity-90`
                        : 'bg-black/30 border-white/10 hover:border-amber-400/60 hover:bg-white/5 cursor-pointer border-dashed'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-slate-950 ${cfg.bg} shadow-md`}
                      >
                        ●
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-sm font-bold text-gray-200 truncate flex items-center gap-2">
                          {assignedPlayer ? assignedPlayer.username : t(cfg.nameKey)}
                          {isMe && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                              {t('ludo.selected_color')}
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {assignedPlayer
                            ? assignedPlayer.isBot
                              ? t('ludo.bot_tag')
                              : 'PLAYER'
                            : t('ludo.choose_color')}
                        </span>
                      </div>
                    </div>

                    <div>
                      {isMe ? (
                        <span className="text-sm font-bold text-amber-400">✓</span>
                      ) : isFree ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            chooseColor(color);
                          }}
                          className="px-3 py-1 bg-white/10 hover:bg-amber-400 hover:text-slate-950 rounded-lg text-xs font-bold transition font-mono cursor-pointer"
                        >
                          {t('ludo.choose_color')}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500 font-mono">
                          {assignedPlayer.isBot
                            ? '🤖'
                            : assignedPlayer.id === gameState.leaderId
                            ? '👑'
                            : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Configurações do Anfitrião */}
            <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
              {isLeader ? (
                <>
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      <span className="text-xs md:text-sm font-bold text-gray-300">
                        {t('ludo.fill_bots_label')}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={gameState.fillBots}
                      onChange={toggleBots}
                      className="w-5 h-5 accent-amber-400 cursor-pointer"
                    />
                  </label>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startGame}
                    className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(251,191,36,0.6)] border border-white transition active:scale-95 cursor-pointer"
                  >
                    {t('ludo.start_game')}
                  </motion.button>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs text-center">
                  ⏳ {t('ludo.waiting_leader')}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* FASE B: TABULEIRO EM JOGO */}
        {gameState.state !== 'LOBBY' && (
          <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
            {/* TABULEIRO 15x15 */}
            <div className="relative w-full max-w-[540px] sm:max-w-[620px] md:max-w-[680px] lg:max-w-[700px] aspect-square bg-slate-900 border-4 border-slate-700/80 rounded-3xl p-2.5 md:p-3.5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex items-center justify-center select-none">
              {/* 1. As 4 Garagens Canto a Canto (Bases Sólidas Estilizadas) */}

              {/* Garagem Vermelha (Top-Left: 6x6) */}
              <div className="absolute top-2.5 md:top-3.5 left-2.5 md:left-3.5 w-[40%] h-[40%] rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-rose-700 p-2 md:p-3 shadow-lg pointer-events-none z-0 flex items-center justify-center border-2 border-red-400">
                <div className="w-full h-full bg-white/95 rounded-xl p-2 shadow-inner grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-red-100 border-2 border-red-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-red-100 border-2 border-red-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-red-100 border-2 border-red-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-red-100 border-2 border-red-400 shadow-sm" />
                </div>
              </div>

              {/* Garagem Verde (Top-Right: 6x6) */}
              <div className="absolute top-2.5 md:top-3.5 right-2.5 md:right-3.5 w-[40%] h-[40%] rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 p-2 md:p-3 shadow-lg pointer-events-none z-0 flex items-center justify-center border-2 border-emerald-400">
                <div className="w-full h-full bg-white/95 rounded-xl p-2 shadow-inner grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-emerald-100 border-2 border-emerald-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-emerald-100 border-2 border-emerald-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-emerald-100 border-2 border-emerald-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-emerald-100 border-2 border-emerald-400 shadow-sm" />
                </div>
              </div>

              {/* Garagem Azul (Bottom-Left: 6x6) */}
              <div className="absolute bottom-2.5 md:bottom-3.5 left-2.5 md:left-3.5 w-[40%] h-[40%] rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-700 p-2 md:p-3 shadow-lg pointer-events-none z-0 flex items-center justify-center border-2 border-blue-400">
                <div className="w-full h-full bg-white/95 rounded-xl p-2 shadow-inner grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-blue-100 border-2 border-blue-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-blue-100 border-2 border-blue-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-blue-100 border-2 border-blue-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-blue-100 border-2 border-blue-400 shadow-sm" />
                </div>
              </div>

              {/* Garagem Amarela (Bottom-Right: 6x6) */}
              <div className="absolute bottom-2.5 md:bottom-3.5 right-2.5 md:right-3.5 w-[40%] h-[40%] rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 p-2 md:p-3 shadow-lg pointer-events-none z-0 flex items-center justify-center border-2 border-amber-300">
                <div className="w-full h-full bg-white/95 rounded-xl p-2 shadow-inner grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-amber-100 border-2 border-amber-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-amber-100 border-2 border-amber-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-amber-100 border-2 border-amber-400 shadow-sm" />
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-amber-100 border-2 border-amber-400 shadow-sm" />
                </div>
              </div>

              {/* 2. Grid de 15x15 Células de Fundo */}
              <div
                style={{
                  gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
                }}
                className="w-full h-full grid gap-0.5 rounded-2xl overflow-hidden z-10"
              >
                {Array.from({ length: 15 }).map((_, row) =>
                  Array.from({ length: 15 }).map((_, col) => {
                    // Células dentro das 4 garagens ficam transparentes pois as bases sólidas renderizam abaixo
                    const isYardCell =
                      (row < 6 && col < 6) ||
                      (row < 6 && col > 8) ||
                      (row > 8 && col < 6) ||
                      (row > 8 && col > 8);

                    if (isYardCell) {
                      return <div key={`${row}_${col}`} className="opacity-0 pointer-events-none" />;
                    }

                    // Determina a cor e estilo de cada casa do circuito
                    let cellColor = 'bg-slate-100 text-slate-900 border border-slate-300/90 shadow-sm';
                    let isStar = false;
                    let isStart = false;
                    let startArrow = '';
                    let centerIcon = '';

                    // 1. Retas Finais (Home Stretches)
                    if (row === 7 && col >= 1 && col <= 5) {
                      cellColor = 'bg-red-500 border border-red-400 text-white shadow-sm';
                    } else if (col === 7 && row >= 1 && row <= 5) {
                      cellColor = 'bg-emerald-500 border border-emerald-400 text-white shadow-sm';
                    } else if (row === 7 && col >= 9 && col <= 13) {
                      cellColor = 'bg-amber-400 border border-amber-300 text-slate-950 shadow-sm';
                    } else if (col === 7 && row >= 9 && row <= 13) {
                      cellColor = 'bg-blue-500 border border-blue-400 text-white shadow-sm';
                    }

                    // 2. Saídas das Cores
                    else if (row === 6 && col === 1) {
                      cellColor = 'bg-red-500 font-black text-white border border-red-600 shadow';
                      isStart = true;
                      startArrow = '➔';
                    } else if (row === 1 && col === 8) {
                      cellColor = 'bg-emerald-500 font-black text-white border border-emerald-600 shadow';
                      isStart = true;
                      startArrow = '⬇';
                    } else if (row === 8 && col === 13) {
                      cellColor = 'bg-amber-400 font-black text-slate-950 border border-amber-500 shadow';
                      isStart = true;
                      startArrow = '⬅';
                    } else if (row === 13 && col === 6) {
                      cellColor = 'bg-blue-500 font-black text-white border border-blue-600 shadow';
                      isStart = true;
                      startArrow = '⬆';
                    }

                    // 3. Casas Seguras com Estrela
                    else if (
                      (row === 2 && col === 6) ||
                      (row === 6 && col === 12) ||
                      (row === 12 && col === 8) ||
                      (row === 8 && col === 2)
                    ) {
                      isStar = true;
                      cellColor = 'bg-amber-100 border-2 border-amber-400 text-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.5)]';
                    }

                    // 4. Centro (Meta 3x3)
                    else if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
                      if (row === 7 && col === 6) {
                        cellColor = 'bg-red-500/90 text-white font-black border border-red-400';
                        centerIcon = '➔';
                      } else if (row === 6 && col === 7) {
                        cellColor = 'bg-emerald-500/90 text-white font-black border border-emerald-400';
                        centerIcon = '⬇';
                      } else if (row === 7 && col === 8) {
                        cellColor = 'bg-amber-400/90 text-slate-950 font-black border border-amber-300';
                        centerIcon = '⬅';
                      } else if (row === 8 && col === 7) {
                        cellColor = 'bg-blue-500/90 text-white font-black border border-blue-400';
                        centerIcon = '⬆';
                      } else if (row === 7 && col === 7) {
                        cellColor = 'bg-slate-900 border-2 border-amber-400 text-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.8)]';
                        centerIcon = '🏆';
                      } else {
                        cellColor = 'bg-slate-800 border border-slate-700/60';
                      }
                    }

                    return (
                      <div
                        key={`${row}_${col}`}
                        className={`relative flex items-center justify-center text-[10px] font-bold ${cellColor}`}
                      >
                        {isStar && <span className="text-amber-500 text-xs md:text-sm drop-shadow">⭐</span>}
                        {isStart && <span className="text-[10px] md:text-xs font-black">{startArrow}</span>}
                        {centerIcon && <span className="text-xs md:text-sm font-black">{centerIcon}</span>}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 3. RENDERIZAÇÃO DOS PEÕES EM CAMADA SOBREPOSTA */}
              <div className="absolute inset-2.5 md:inset-3.5 pointer-events-none z-20">
                {Object.entries(pawnsByCoord).map(([coordKey, pawnList]) => {
                  const [rowStr, colStr] = coordKey.split('_');
                  const row = parseInt(rowStr, 10);
                  const col = parseInt(colStr, 10);

                  const topPct = (row / 15) * 100;
                  const leftPct = (col / 15) * 100;
                  const count = pawnList.length;

                  return (
                    <div
                      key={coordKey}
                      style={{
                        top: `${topPct}%`,
                        left: `${leftPct}%`,
                        width: '6.666%',
                        height: '6.666%',
                      }}
                      className="absolute flex items-center justify-center pointer-events-auto transition-all duration-100 ease-out"
                    >
                      {pawnList.map(({ pawn, player: pawnOwner }, idx) => {
                        const canMoveThisPawn =
                          isMyTurn &&
                          gameState.state === 'WAITING_MOVE' &&
                          gameState.validMoves.includes(pawn.id);

                        const cfg = COLOR_CONFIG[pawn.color];
                        const isWalking =
                          walkingPawn &&
                          walkingPawn.playerId === pawnOwner.id &&
                          walkingPawn.pawnId === pawn.id;

                        return (
                          <motion.button
                            key={`${pawn.color}_${pawn.id}`}
                            type="button"
                            disabled={!canMoveThisPawn}
                            onClick={() => {
                              if (canMoveThisPawn) {
                                movePawn(pawn.id);
                              }
                            }}
                            whileHover={canMoveThisPawn ? { scale: 1.4, zIndex: 30 } : {}}
                            animate={
                              isWalking
                                ? { scale: [1, 1.35, 1], y: [0, -6, 0] }
                                : canMoveThisPawn
                                ? {
                                    scale: [1, 1.25, 1],
                                    y: [0, -4, 0],
                                  }
                                : { scale: 1, y: 0 }
                            }
                            transition={{
                              duration: isWalking ? 0.14 : 0.5,
                              repeat: canMoveThisPawn && !isWalking ? Infinity : 0,
                              repeatDelay: 0.2,
                            }}
                            className={`relative rounded-full flex items-center justify-center border-2 transition-all ${
                              count > 1 ? 'w-4 h-4 md:w-5 md:h-5' : 'w-5 h-5 md:w-7 md:h-7'
                            } ${cfg.bg} ${cfg.border} ${
                              canMoveThisPawn
                                ? 'shadow-[0_0_20px_rgba(255,255,255,0.9)] border-white cursor-pointer z-30 animate-pulse'
                                : 'shadow-md cursor-default'
                            }`}
                          >
                            <span className="text-[9px] md:text-[10px] font-black text-slate-950 font-mono">
                              {pawn.id + 1}
                            </span>

                            {/* Badge de agrupamento caso haja mais de 1 peão na mesma casa */}
                            {idx === 0 && count > 1 && (
                              <span className="absolute -top-2 -right-2 bg-slate-950 text-white font-mono font-bold text-[8px] px-1 rounded-full border border-white/40 shadow">
                                x{count}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PAINEL LATERAL: CONTROLES, DADO & STATUS */}
            <div className="flex flex-col gap-5 max-w-sm w-full">
              {/* Placar de Peões na Meta */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 shadow-xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-3 border-b border-white/10 pb-2">
                  {t('ludo.pawns_in_goal', { count: '' })}
                </span>
                <div className="space-y-2">
                  {gameState.players.map((p) => {
                    const cfg = COLOR_CONFIG[p.color as LudoColor] || COLOR_CONFIG.RED;
                    const isActive = gameState.players[gameState.activePlayerIndex]?.id === p.id;
                    const isMe = p.id === myId;

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isActive
                            ? `${cfg.yardBg} border-2 ${cfg.border} ${cfg.shadow} scale-[1.02]`
                            : 'bg-black/40 border-white/5 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-3.5 h-3.5 rounded-full ${cfg.bg}`} />
                          <span className="text-xs font-bold truncate">
                            {p.username} {isMe && t('ludo.you_tag')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                          <span className={cfg.text}>{p.score}</span>
                          <span className="text-gray-500">/ 4</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Área do Dado e Ações */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2">
                  {activePlayer && (
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                        COLOR_CONFIG[activePlayer.color as LudoColor]?.bg || 'bg-amber-400'
                      } text-slate-950`}
                    >
                      {activePlayer.username}
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-gray-300">
                    {isMyTurn
                      ? t('ludo.your_turn')
                      : t('ludo.player_turn', { name: activePlayer?.username })}
                  </span>
                </div>

                {/* Dado Visual */}
                <DiceView
                  value={gameState.currentDice}
                  isRolling={isRollingAnimation}
                  canRoll={canRoll}
                  onClick={canRoll ? rollDice : undefined}
                />

                {/* Instruções Dinâmicas */}
                <div className="min-h-[38px] flex items-center justify-center">
                  {canRoll ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={rollDice}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.6)] cursor-pointer"
                    >
                      🎲 {t('ludo.roll_dice')}
                    </motion.button>
                  ) : isWaitingMove ? (
                    <span className="text-xs font-bold text-amber-300 animate-pulse bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-500/30">
                      👆 {t('ludo.select_pawn')}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-mono">
                      {gameState.currentDice > 0
                        ? t('ludo.rolled_value', {
                            name: activePlayer?.username,
                            val: gameState.currentDice,
                          })
                        : t('ludo.rolling')}
                    </span>
                  )}
                </div>
              </div>

              {/* Histórico da Mesa (Action Log) */}
              <div className="bg-black/60 border border-white/10 rounded-2xl p-4 shadow-xl">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-2">
                  {t('ludo.action_log')}
                </span>
                <div className="h-28 overflow-y-auto space-y-1 text-[11px] font-mono text-gray-400 pr-1">
                  {gameState.actionLog?.slice(-8).map((log, idx) => (
                    <div key={idx} className="truncate">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FASE C: MODAL DE VITÓRIA / FIM DE JOGO */}
        <AnimatePresence>
          {gameState.state === 'GAME_OVER' && gameState.winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            >
              <div className="max-w-md w-full bg-slate-950 border-2 border-amber-400 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(251,191,36,0.5)] text-center flex flex-col items-center gap-4">
                <div className="text-6xl animate-bounce">👑</div>
                <h2 className="text-3xl font-black text-amber-400 uppercase tracking-widest">
                  {t('ludo.champion_title')}
                </h2>
                <div
                  className={`px-4 py-2 rounded-2xl font-black text-lg text-slate-950 ${
                    COLOR_CONFIG[gameState.winner.color as LudoColor]?.bg || 'bg-amber-400'
                  }`}
                >
                  {gameState.winner.username}
                </div>
                <p className="text-xs md:text-sm text-gray-300">
                  {t('ludo.champion_desc')}
                </p>

                <div className="w-full flex gap-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => navigate('/hub')}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    {t('common.back_to_hub')}
                  </button>
                  <button
                    onClick={restartGame}
                    className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg"
                  >
                    {t('ludo.play_again')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
