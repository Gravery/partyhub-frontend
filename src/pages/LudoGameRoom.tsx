import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useLudoStore,
  type LudoColor,
  ludoAudio,
} from '../store/useLudoStore';
import { getPawnPosition, type Position } from '../lib/ludoBoard';
import { useAuthStore } from '../store/useAuthStore';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { SideDrawer, type TabOption } from '../components/game/SideDrawer';
import { Users, BookOpen, History as HistoryIcon } from 'lucide-react';

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
      className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl p-2 flex items-center justify-center border-2 transition-all shadow-md select-none shrink-0 ${
        canRoll
          ? 'bg-gradient-to-br from-white to-gray-200 border-amber-400 cursor-pointer shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse'
          : 'bg-gradient-to-br from-gray-800 to-gray-950 border-white/10 cursor-default opacity-85'
      }`}
    >
      {value === 0 ? (
        <span className="text-gray-500 text-xl font-black font-mono">?</span>
      ) : (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full gap-0.5">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-center">
              {activePips.includes(idx) && (
                <div
                  className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${
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
  const { user, session } = useAuthStore();

  const {
    gameState,
    isRollingAnimation,
    toastMessage,
    errorMsg,
    extraTurnBanner,
    connect,
    disconnect,
    chooseColor,
    toggleBots,
    startGame,
    rollDice,
    movePawn,
    restartGame,
    continueMatch,
    finishMatch,
    clearToast,
    clearError,
    soundEnabled,
    toggleSound,
  } = useLudoStore();

  const [animatedSteps, setAnimatedSteps] = useState<Record<string, number>>({});
  const [returningPawns, setReturningPawns] = useState<Record<string, boolean>>({});
  const [drawerTab, setDrawerTab] = useState<'players' | 'history' | 'rules' | null>(null);
  const previousPawnsState = useRef<Record<string, { step: number; inYard: boolean }>>({});
  const lastExecutedMoveId = useRef<number | null>(null);

  useEffect(() => {
    if (!session?.access_token || !roomId) {
      navigate('/hub');
      return;
    }
    connect(roomId, session.access_token);
    return () => disconnect();
  }, [roomId, session]);

  // Efeito sonoro do dado
  useEffect(() => {
    if (isRollingAnimation) {
      ludoAudio.playDiceRoll();
    }
  }, [isRollingAnimation]);

  // Detecção de capturas e retorno suave para a base
  useEffect(() => {
    if (!gameState?.players) return;
    const currentPawns: Record<string, { step: number; inYard: boolean }> = {};
    const newlyCapturedKeys: string[] = [];

    gameState.players.forEach((p) => {
      p.pawns.forEach((pawn) => {
        const pawnKey = `${p.id}_${pawn.id}`;
        currentPawns[pawnKey] = { step: pawn.step, inYard: pawn.inYard };
        const prev = previousPawnsState.current[pawnKey];
        if (prev && !prev.inYard && pawn.inYard) {
          newlyCapturedKeys.push(pawnKey);
        }
      });
    });

    previousPawnsState.current = currentPawns;

    if (newlyCapturedKeys.length > 0) {
      ludoAudio.playCapture();
      setReturningPawns((prev) => {
        const next = { ...prev };
        newlyCapturedKeys.forEach((k) => (next[k] = true));
        return next;
      });

      const timer = setTimeout(() => {
        setReturningPawns((prev) => {
          const next = { ...prev };
          newlyCapturedKeys.forEach((k) => delete next[k]);
          return next;
        });
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [gameState?.players]);

  // Animação passo a passo do peão (apenas UMA VEZ por jogada real)
  useEffect(() => {
    const lm = gameState?.lastMove;
    if (!lm) return;

    if (lm.moveId !== undefined) {
      if (lastExecutedMoveId.current === lm.moveId) return;
      lastExecutedMoveId.current = lm.moveId;
    }

    const pawnKey = `${lm.playerId}_${lm.pawnIndex}`;
    const player = gameState.players.find((p) => p.id === lm.playerId);
    const pawn = player?.pawns[lm.pawnIndex];
    const target = pawn ? pawn.step : lm.toStep;

    if (target > lm.fromStep) {
      let current = lm.fromStep;
      setAnimatedSteps((prev) => ({ ...prev, [pawnKey]: current }));

      const interval = setInterval(() => {
        current += 1;
        ludoAudio.playPawnStep();
        setAnimatedSteps((prev) => ({ ...prev, [pawnKey]: current }));

        if (current >= target) {
          clearInterval(interval);
          setTimeout(() => {
            setAnimatedSteps((prev) => {
              const next = { ...prev };
              delete next[pawnKey];
              return next;
            });
          }, 250);
        }
      }, 150);

      const watchdog = setTimeout(() => {
        clearInterval(interval);
        setAnimatedSteps((prev) => {
          const next = { ...prev };
          delete next[pawnKey];
          return next;
        });
      }, (target - lm.fromStep + 2) * 150 + 600);

      return () => {
        clearInterval(interval);
        clearTimeout(watchdog);
      };
    }
  }, [gameState?.lastMove?.moveId]);

  if (!gameState) {
    return (
      <div className="h-[100dvh] bg-slate-950 flex flex-col items-center justify-center text-white p-4 font-mono">
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
  const totalPlayers = gameState.players.length;

  const pawnPositions: {
    player: typeof gameState.players[0];
    pawn: typeof gameState.players[0]['pawns'][0];
    pos: Position;
    pawnKey: string;
    isWalking: boolean;
    isReturning: boolean;
  }[] = [];

  gameState.players.forEach((p) => {
    p.pawns.forEach((pawn) => {
      const pawnKey = `${p.id}_${pawn.id}`;
      const isCurrentlyWalking =
        !!(gameState.lastMove &&
        `${gameState.lastMove.playerId}_${gameState.lastMove.pawnIndex}` === pawnKey &&
        animatedSteps[pawnKey] !== undefined);
      const currentStep = isCurrentlyWalking ? animatedSteps[pawnKey] : pawn.step;
      const pos = getPawnPosition(p.color, pawn.id, currentStep);
      pawnPositions.push({
        player: p,
        pawn,
        pos,
        pawnKey,
        isWalking: isCurrentlyWalking,
        isReturning: !!returningPawns[pawnKey],
      });
    });
  });

  const pawnsPerCoord: Record<string, number> = {};
  pawnPositions.forEach(({ pos }) => {
    const key = `${pos.row}_${pos.col}`;
    pawnsPerCoord[key] = (pawnsPerCoord[key] || 0) + 1;
  });

  const coordCounter: Record<string, number> = {};

  const drawerTabs: TabOption[] = [
    { id: 'players', label: `Jogadores (${totalPlayers})`, icon: <Users size={14} /> },
    { id: 'history', label: 'Histórico', icon: <HistoryIcon size={14} /> },
    { id: 'rules', label: 'Regras', icon: <BookOpen size={14} /> },
  ];

  return (
    <GameShell
      themeClass="bg-slate-950 text-white"
      header={
        <GameHeader
          gameTitle="LUDO"
          gameBadge="TABULEIRO"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          accentColor="text-amber-400"
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => setDrawerTab('players')}
          onToggleLog={() => setDrawerTab('history')}
          onToggleRules={() => setDrawerTab('rules')}
          centerContent={
            gameState.state !== 'LOBBY' ? (
              <div className="flex items-center gap-2">
                {activePlayer && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow ${
                      COLOR_CONFIG[activePlayer.color as LudoColor]?.bg || 'bg-amber-400'
                    } text-slate-950`}
                  >
                    <span>🎲</span>
                    <span className="truncate max-w-[110px]">{activePlayer.username}</span>
                  </span>
                )}
                {gameState.currentDice > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono font-bold text-xs text-amber-300">
                    Dado: {gameState.currentDice}
                  </span>
                )}
              </div>
            ) : null
          }
        />
      }
      footer={
        /* Bottom Control Dock: Dice & Turn Info */
        gameState.state !== 'LOBBY' ? (
          <div className="w-full bg-slate-900/95 border-t border-white/10 px-3 py-2 md:py-2.5 backdrop-blur-md">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
              {/* Turn status indicator */}
              <div className="flex items-center gap-2 min-w-0">
                <DiceView
                  value={gameState.currentDice}
                  isRolling={isRollingAnimation}
                  canRoll={canRoll}
                  onClick={canRoll ? rollDice : undefined}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">
                    {isMyTurn
                      ? t('ludo.your_turn')
                      : t('ludo.player_turn', { name: activePlayer?.username })}
                  </span>
                  <span className="text-[11px] text-gray-400 truncate">
                    {canRoll
                      ? 'Clique no dado para rolar'
                      : isWaitingMove
                      ? 'Clique em uma de suas peças para andar'
                      : gameState.currentDice > 0
                      ? `Tirou ${gameState.currentDice}`
                      : 'Aguardando jogada...'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              {canRoll && (
                <button
                  type="button"
                  onClick={rollDice}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  🎲 {t('ludo.roll_dice')}
                </button>
              )}

              {isWaitingMove && (
                <span className="px-3 py-1.5 bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold text-xs rounded-xl animate-pulse shrink-0">
                  👆 Mova uma Peça
                </span>
              )}
            </div>
          </div>
        ) : null
      }
      overlay={
        <>
          {/* Notifications Overlays */}
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4">
            <AnimatePresence>
              {extraTurnBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="px-4 py-1.5 bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-lg border border-white"
                >
                  {extraTurnBanner}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {toastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between gap-3 w-full pointer-events-auto"
                >
                  <span>{toastMessage}</span>
                  <button onClick={clearToast} className="text-white font-mono text-xs">✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="px-4 py-1.5 bg-rose-950 border border-rose-500 text-rose-200 text-xs rounded-xl shadow flex justify-between items-center gap-2 w-full pointer-events-auto"
                >
                  <span>⚠️ {errorMsg}</span>
                  <button onClick={clearError} className="text-xs">✕</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Podium Choice Modal */}
          <AnimatePresence>
            {gameState.state === 'PODIUM_CHOICE' && gameState.winner && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="max-w-sm w-full bg-slate-950 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center gap-3"
                >
                  <div className="text-5xl">🥇</div>
                  <h3 className="text-xl font-black text-amber-400 uppercase">
                    1º Lugar: {gameState.winner.username}!
                  </h3>
                  <p className="text-xs text-gray-300">
                    Todos os 4 peões cruzaram a meta! Desejam continuar disputando o 2º e 3º lugares?
                  </p>

                  {isLeader ? (
                    <div className="w-full flex flex-col gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={continueMatch}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                      >
                        Continuar Disputa (2º e 3º)
                      </button>
                      <button
                        onClick={finishMatch}
                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                      >
                        Encerrar Partida
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-300 italic">Aguardando o líder decidir...</p>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Game Over Modal */}
          <AnimatePresence>
            {gameState.state === 'GAME_OVER' && gameState.winner && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="max-w-sm w-full bg-slate-950 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center gap-3"
                >
                  <div className="text-5xl">👑</div>
                  <h3 className="text-2xl font-black text-amber-400 uppercase">
                    {t('ludo.champion_title')}
                  </h3>

                  <div className="w-full space-y-1.5 text-left my-2">
                    {(gameState.rankings && gameState.rankings.length > 0
                      ? gameState.rankings
                      : [gameState.winner]
                    ).map((p, idx) => {
                      const cfg = COLOR_CONFIG[p.color as LudoColor] || COLOR_CONFIG.RED;
                      const medals = ['🥇', '🥈', '🥉', '🎖️'];
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>{medals[idx] || `${idx + 1}º`}</span>
                            <div className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                            <span className="font-bold truncate">{p.username}</span>
                          </div>
                          <span className="font-mono text-gray-400">{p.score}/4 na meta</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-full flex gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => navigate('/hub')}
                      className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                    >
                      Hub
                    </button>
                    <button
                      onClick={restartGame}
                      className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-xl transition cursor-pointer"
                    >
                      Jogar Novamente
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Off-canvas Side Drawer */}
          <SideDrawer
            isOpen={drawerTab !== null}
            onClose={() => setDrawerTab(null)}
            title="Ludo"
            tabs={drawerTabs}
            activeTab={drawerTab || 'players'}
            onTabChange={(tab) => setDrawerTab(tab as any)}
          >
            {drawerTab === 'players' && (
              <div className="space-y-3">
                <span className="text-xs text-gray-400 block">Peões na Meta</span>
                <div className="space-y-2">
                  {gameState.players.map((p) => {
                    const cfg = COLOR_CONFIG[p.color as LudoColor] || COLOR_CONFIG.RED;
                    const isActive = gameState.players[gameState.activePlayerIndex]?.id === p.id;
                    const isMe = p.id === myId;

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                          isActive
                            ? `${cfg.yardBg} border-2 ${cfg.border} shadow-md`
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-3 h-3 rounded-full ${cfg.bg}`} />
                          <span className="font-bold truncate">
                            {p.username} {isMe && '(Você)'} {p.isBot && '🤖'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-xs">
                          {p.score} / 4 peões
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {drawerTab === 'history' && (
              <div className="space-y-1.5 text-xs font-mono text-gray-400">
                {gameState.actionLog?.slice(-15).map((log, idx) => (
                  <div key={idx} className="p-2 bg-white/5 rounded-lg border border-white/5">
                    {log}
                  </div>
                ))}
              </div>
            )}

            {drawerTab === 'rules' && (
              <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                <div>
                  <h4 className="font-bold text-amber-400 text-sm mb-1">Como Jogar Ludo</h4>
                  <p>Cada jogador tem 4 peões em sua base. Tire 6 no dado para colocar um peão na pista de corrida.</p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-400 text-sm mb-1">Captura de Peões</h4>
                  <p>Se você parar na mesma casa que uma peça adversária (fora das casas seguras com estrela ⭐), a peça inimiga é capturada e retorna à base!</p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-400 text-sm mb-1">Meta e Vitória</h4>
                  <p>Percorra o circuito completo e entre na reta final até o centro do tabuleiro. O primeiro a colocar os 4 peões no centro vence!</p>
                </div>
              </div>
            )}
          </SideDrawer>
        </>
      }
    >
      {/* LOBBY VIEW */}
      {gameState.state === 'LOBBY' && (
        <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center my-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-3xl mx-auto">
            🎲
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400">
              Ludo Multiplayer
            </h2>
            <p className="text-gray-400 text-xs mt-1">
              Escolha sua cor favorita ou preencha vagas vazias com bots!
            </p>
          </div>

          {/* Jogadores Conectados na Sala */}
          <div className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-left space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Jogadores Conectados ({gameState.players.length}/4):
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {gameState.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-xs"
                >
                  <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className="font-bold text-white text-xs">
                    {p.username} {p.id === myId && '(Você)'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Color Selection Cards */}
          <div className="grid grid-cols-2 gap-2 text-left">
            {(['RED', 'GREEN', 'YELLOW', 'BLUE'] as LudoColor[]).map((color) => {
              const cfg = COLOR_CONFIG[color];
              const assignedPlayer = gameState.players.find((p) => p.color === color);
              const isMe = assignedPlayer?.id === myId;
              const isFree = !assignedPlayer;

              return (
                <div
                  key={color}
                  onClick={() => isFree && chooseColor(color)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                    isMe
                      ? `${cfg.yardBg} border-2 ${cfg.border} shadow-md`
                      : isFree
                      ? 'bg-white/5 border-white/10 hover:border-white/30'
                      : 'bg-black/30 border-white/5 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className={`w-3.5 h-3.5 rounded-full ${cfg.bg}`} />
                    <span className="text-xs font-bold truncate">
                      {assignedPlayer ? assignedPlayer.username : t(cfg.nameKey)}
                    </span>
                  </div>
                  {isMe && <span className="text-amber-400 text-xs font-bold">✓</span>}
                  {isFree && <span className="text-[10px] text-gray-500">Livre</span>}
                </div>
              );
            })}
          </div>

          {/* Host Controls */}
          {isLeader && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <span className="text-xs font-bold text-gray-300">🤖 Preencher com Bots</span>
                <input
                  type="checkbox"
                  checked={gameState.fillBots}
                  onChange={toggleBots}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </label>

              <button
                onClick={startGame}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer"
              >
                Iniciar Partida 🚀
              </button>
            </div>
          )}
        </div>
      )}

      {/* ACTIVE GAMEPLAY: SCALED 15x15 BOARD */}
      {gameState.state !== 'LOBBY' && (
        <div className="flex-1 w-full flex items-center justify-center min-h-0 my-auto">
          <div className="relative w-[min(90vw,60vh,490px)] h-[min(90vw,60vh,490px)] aspect-square bg-slate-900 border-2 md:border-4 border-slate-700/80 rounded-2xl md:rounded-3xl p-2 md:p-3 shadow-2xl flex items-center justify-center select-none shrink-0">
            {/* 1. As 4 Garagens Canto a Canto */}
            {/* Garagem Vermelha (Top-Left: 6x6) */}
            <div className="absolute top-2 md:top-3 left-2 md:left-3 w-[40%] h-[40%] rounded-xl md:rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-rose-700 p-1.5 md:p-2.5 shadow pointer-events-none z-0 flex items-center justify-center border border-red-400">
              <div className="w-full h-full bg-white/95 rounded-lg p-1.5 shadow-inner grid grid-cols-2 grid-rows-2 gap-1.5 place-items-center">
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-red-100 border border-red-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-red-100 border border-red-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-red-100 border border-red-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-red-100 border border-red-400 shadow-sm" />
              </div>
            </div>

            {/* Garagem Verde (Top-Right: 6x6) */}
            <div className="absolute top-2 md:top-3 right-2 md:right-3 w-[40%] h-[40%] rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-700 p-1.5 md:p-2.5 shadow pointer-events-none z-0 flex items-center justify-center border border-emerald-400">
              <div className="w-full h-full bg-white/95 rounded-lg p-1.5 shadow-inner grid grid-cols-2 grid-rows-2 gap-1.5 place-items-center">
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-emerald-100 border border-emerald-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-emerald-100 border border-emerald-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-emerald-100 border border-emerald-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-emerald-100 border border-emerald-400 shadow-sm" />
              </div>
            </div>

            {/* Garagem Azul (Bottom-Left: 6x6) */}
            <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 w-[40%] h-[40%] rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-700 p-1.5 md:p-2.5 shadow pointer-events-none z-0 flex items-center justify-center border border-blue-400">
              <div className="w-full h-full bg-white/95 rounded-lg p-1.5 shadow-inner grid grid-cols-2 grid-rows-2 gap-1.5 place-items-center">
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-blue-100 border border-blue-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-blue-100 border border-blue-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-blue-100 border border-blue-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-blue-100 border border-blue-400 shadow-sm" />
              </div>
            </div>

            {/* Garagem Amarela (Bottom-Right: 6x6) */}
            <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 w-[40%] h-[40%] rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 p-1.5 md:p-2.5 shadow pointer-events-none z-0 flex items-center justify-center border border-amber-300">
              <div className="w-full h-full bg-white/95 rounded-lg p-1.5 shadow-inner grid grid-cols-2 grid-rows-2 gap-1.5 place-items-center">
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-amber-100 border border-amber-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-amber-100 border border-amber-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-amber-100 border border-amber-400 shadow-sm" />
                <div className="w-5 h-5 md:w-7 md:h-7 rounded-full bg-amber-100 border border-amber-400 shadow-sm" />
              </div>
            </div>

            {/* 2. Grid 15x15 */}
            <div
              style={{
                gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
              }}
              className="w-full h-full grid gap-[1px] rounded-xl overflow-hidden z-10"
            >
              {Array.from({ length: 15 }).map((_, row) =>
                Array.from({ length: 15 }).map((_, col) => {
                  const isYardCell =
                    (row < 6 && col < 6) ||
                    (row < 6 && col > 8) ||
                    (row > 8 && col < 6) ||
                    (row > 8 && col > 8);

                  if (isYardCell) {
                    return <div key={`${row}_${col}`} className="opacity-0 pointer-events-none" />;
                  }

                  let cellColor = 'bg-slate-100 text-slate-900 border border-slate-300/80';
                  let isStar = false;
                  let isStart = false;
                  let startArrow = '';
                  let centerIcon = '';

                  // Home Stretches
                  if (row === 7 && col >= 1 && col <= 5) {
                    cellColor = 'bg-red-500 border border-red-400 text-white';
                  } else if (col === 7 && row >= 1 && row <= 5) {
                    cellColor = 'bg-emerald-500 border border-emerald-400 text-white';
                  } else if (row === 7 && col >= 9 && col <= 13) {
                    cellColor = 'bg-amber-400 border border-amber-300 text-slate-950';
                  } else if (col === 7 && row >= 9 && row <= 13) {
                    cellColor = 'bg-blue-500 border border-blue-400 text-white';
                  }

                  // Saídas das Cores
                  else if (row === 6 && col === 1) {
                    cellColor = 'bg-red-500 font-black text-white border border-red-600';
                    isStart = true;
                    startArrow = '➔';
                  } else if (row === 1 && col === 8) {
                    cellColor = 'bg-emerald-500 font-black text-white border border-emerald-600';
                    isStart = true;
                    startArrow = '⬇';
                  } else if (row === 8 && col === 13) {
                    cellColor = 'bg-amber-400 font-black text-slate-950 border border-amber-500';
                    isStart = true;
                    startArrow = '⬅';
                  } else if (row === 13 && col === 6) {
                    cellColor = 'bg-blue-500 font-black text-white border border-blue-600';
                    isStart = true;
                    startArrow = '⬆';
                  }

                  // Casas Seguras com Estrela
                  else if (
                    (row === 2 && col === 6) ||
                    (row === 6 && col === 12) ||
                    (row === 12 && col === 8) ||
                    (row === 8 && col === 2)
                  ) {
                    isStar = true;
                    cellColor = 'bg-amber-100 border border-amber-400 text-amber-600';
                  }

                  // Centro (Meta)
                  else if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
                    if (row === 7 && col === 6) {
                      cellColor = 'bg-red-500/90 text-white font-black';
                      centerIcon = '➔';
                    } else if (row === 6 && col === 7) {
                      cellColor = 'bg-emerald-500/90 text-white font-black';
                      centerIcon = '⬇';
                    } else if (row === 7 && col === 8) {
                      cellColor = 'bg-amber-400/90 text-slate-950 font-black';
                      centerIcon = '⬅';
                    } else if (row === 8 && col === 7) {
                      cellColor = 'bg-blue-500/90 text-white font-black';
                      centerIcon = '⬆';
                    } else if (row === 7 && col === 7) {
                      cellColor = 'bg-slate-900 border border-amber-400 text-amber-400 shadow-md';
                      centerIcon = '🏆';
                    } else {
                      cellColor = 'bg-slate-800 border border-slate-700/60';
                    }
                  }

                  return (
                    <div
                      key={`${row}_${col}`}
                      className={`relative flex items-center justify-center text-[8px] md:text-[10px] font-bold ${cellColor}`}
                    >
                      {isStar && <span className="text-amber-500 text-[9px] md:text-xs">⭐</span>}
                      {isStart && <span className="text-[8px] md:text-[10px] font-black">{startArrow}</span>}
                      {centerIcon && <span className="text-[9px] md:text-xs font-black">{centerIcon}</span>}
                    </div>
                  );
                })
              )}
            </div>

            {/* 3. Renderização dos 16 Peões */}
            <div className="absolute inset-2 md:inset-3 pointer-events-none z-20">
              {pawnPositions.map(({ player: pawnOwner, pawn, pos, pawnKey, isWalking, isReturning }) => {
                const coordKey = `${pos.row}_${pos.col}`;
                const countInCoord = pawnsPerCoord[coordKey] || 1;
                const idxInCoord = coordCounter[coordKey] || 0;
                coordCounter[coordKey] = idxInCoord + 1;

                let offsetX = 0;
                let offsetY = 0;
                if (!pawn.inYard && countInCoord > 1) {
                  if (countInCoord === 2) {
                    offsetX = idxInCoord === 0 ? -2 : 2;
                    offsetY = idxInCoord === 0 ? -2 : 2;
                  } else {
                    offsetX = idxInCoord % 2 === 0 ? -3 : 3;
                    offsetY = idxInCoord < 2 ? -3 : 3;
                  }
                }

                const topPct = (pos.row / 15) * 100;
                const leftPct = (pos.col / 15) * 100;

                const isMyPawn = activePlayer && pawnOwner.id === myId;
                const canMoveThisPawn =
                  isMyTurn &&
                  isMyPawn &&
                  gameState.state === 'WAITING_MOVE' &&
                  gameState.validMoves.includes(pawn.id);

                const cfg = COLOR_CONFIG[pawn.color];

                return (
                  <motion.div
                    key={pawnKey}
                    initial={false}
                    animate={{
                      top: `${topPct}%`,
                      left: `${leftPct}%`,
                      x: offsetX,
                      y: offsetY,
                      scale: isReturning ? [1.2, 0.8, 1] : isWalking ? 1.2 : 1,
                      rotate: isReturning ? [0, 360] : 0,
                      zIndex: isWalking || isReturning ? 40 : canMoveThisPawn ? 30 : 20 + idxInCoord,
                    }}
                    transition={
                      isReturning
                        ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
                        : { duration: 0.14, ease: 'easeInOut' }
                    }
                    style={{
                      width: '6.666%',
                      height: '6.666%',
                    }}
                    className="absolute flex items-center justify-center pointer-events-auto"
                  >
                    <motion.button
                      type="button"
                      disabled={!canMoveThisPawn}
                      onClick={() => canMoveThisPawn && movePawn(pawn.id)}
                      whileHover={canMoveThisPawn ? { scale: 1.35, zIndex: 50 } : {}}
                      animate={
                        canMoveThisPawn
                          ? {
                              scale: [1, 1.2, 1],
                              y: [0, -3, 0],
                            }
                          : { scale: 1, y: 0 }
                      }
                      transition={{
                        duration: 0.5,
                        repeat: canMoveThisPawn ? Infinity : 0,
                      }}
                      className={`relative rounded-full flex items-center justify-center border-2 transition-shadow ${
                        pawn.inYard ? 'w-5 h-5 md:w-6 md:h-6' : 'w-4 h-4 md:w-5 md:h-5'
                      } ${cfg.bg} ${cfg.border} ${
                        canMoveThisPawn
                          ? 'shadow-[0_0_15px_rgba(255,255,255,0.9)] border-white cursor-pointer animate-pulse'
                          : 'shadow-sm cursor-default'
                      }`}
                    >
                      <span className="text-[8px] md:text-[9px] font-black text-slate-950 font-mono">
                        {pawn.id + 1}
                      </span>

                      {idxInCoord === 0 && countInCoord > 1 && !pawn.inYard && (
                        <span className="absolute -top-1.5 -right-1.5 bg-slate-950 text-white font-mono font-bold text-[7px] px-1 rounded-full border border-white/40">
                          x{countInCoord}
                        </span>
                      )}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </GameShell>
  );
}
