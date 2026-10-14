import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useLudoStore, type LudoColor, ludoAudio } from '../store/useLudoStore';
import { getPawnPosition, type Position } from '../lib/ludoBoard';
import { useAuthStore } from '../store/useAuthStore';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { type TabOption } from '../components/game/SideDrawer';
import { GameLobby, type LobbyPlayer } from '../components/game/GameLobby';
import {
  StatusPill,
  GameNotice,
  ConnectionNotices,
  GameLoading,
  RulesList,
  ResultModal,
  EmptyState,
} from '../components/game/ui';
import {
  Users,
  BookOpen,
  History as HistoryIcon,
  Star,
  Trophy,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bot,
  Check,
  Crown,
  Medal,
  Home,
  RotateCcw,
  Dices,
} from 'lucide-react';

// Uma cor por jogador; o hex alimenta barras e marcadores
const COLOR_CONFIG: Record<LudoColor, { bg: string; ring: string; hex: string; nameKey: string }> = {
  RED: { bg: 'bg-red-500', ring: 'border-red-300', hex: '#EF4444', nameKey: 'ludo.color_red' },
  GREEN: { bg: 'bg-emerald-500', ring: 'border-emerald-300', hex: '#10B981', nameKey: 'ludo.color_green' },
  YELLOW: { bg: 'bg-amber-400', ring: 'border-amber-200', hex: '#FBBF24', nameKey: 'ludo.color_yellow' },
  BLUE: { bg: 'bg-blue-500', ring: 'border-blue-300', hex: '#3B82F6', nameKey: 'ludo.color_blue' },
};

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DiceView({ value, isRolling, canRoll, onClick }: { value: number; isRolling: boolean; canRoll: boolean; onClick?: () => void }) {
  const { t } = useTranslation();
  const activePips = PIPS[value] || [];

  return (
    <motion.button
      type="button"
      disabled={!canRoll}
      onClick={onClick}
      aria-label={value > 0 ? t('ludo.dice_shows', { value }) : t('ludo.roll_dice')}
      whileHover={canRoll ? { scale: 1.06 } : {}}
      whileTap={canRoll ? { scale: 0.94 } : {}}
      animate={isRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 0.95, 1] } : { rotate: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className={`relative w-18 h-18 xl:w-22 xl:h-22 rounded-2xl p-3 grid grid-cols-3 grid-rows-3 place-items-center shrink-0 border-2 transition-colors ${
        canRoll ? 'bg-amber-100 border-accent cursor-pointer shadow-[0_0_0_6px_var(--accent-soft)]' : 'bg-raised border-line-strong cursor-default'
      }`}
    >
      {value === 0 ? (
        <Dices size={28} className="col-span-3 row-span-3 text-muted" aria-hidden="true" />
      ) : (
        Array.from({ length: 9 }).map((_, idx) => (
          <span
            key={idx}
            className={`w-3 h-3 xl:w-3.5 xl:h-3.5 rounded-full ${activePips.includes(idx) ? (canRoll ? 'bg-[#422006]' : 'bg-ink') : ''}`}
          />
        ))
      )}
    </motion.button>
  );
}

type SideTab = 'players' | 'history' | 'rules';

export function LudoGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, session } = useAuthStore();

  const {
    gameState,
    isRollingAnimation,
    isReconnecting,
    reconnectAttempt,
    manualReconnect,
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
  const [sideTab, setSideTab] = useState<SideTab>('players');
  const [sideOpen, setSideOpen] = useState(false);
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

  useEffect(() => {
    if (isRollingAnimation) ludoAudio.playDiceRoll();
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
        if (prev && !prev.inYard && pawn.inYard) newlyCapturedKeys.push(pawnKey);
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

  const myId = user?.id || '';
  const activePlayer = gameState?.players[gameState.activePlayerIndex];
  const isMyTurn = Boolean(activePlayer && activePlayer.id === myId);
  const canRoll = isMyTurn && gameState?.state === 'WAITING_ROLL';

  // Atalho: barra de espaço rola o dado
  useEffect(() => {
    if (!canRoll) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
        e.preventDefault();
        rollDice();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canRoll, rollDice]);

  if (!gameState) {
    return (
      <GameLoading
        accent="amber"
        message={isReconnecting ? t('common.reconnecting', { attempt: reconnectAttempt }) : t('common.entering_room', { roomId })}
        onRetry={isReconnecting ? manualReconnect : undefined}
      />
    );
  }

  const isLeader = gameState.leaderId === myId;
  const isLobby = gameState.state === 'LOBBY';
  const isWaitingMove = isMyTurn && gameState.state === 'WAITING_MOVE';
  const totalPlayers = gameState.players.length;

  const openSide = (tab: SideTab) => {
    setSideTab(tab);
    setSideOpen(true);
  };

  const pawnPositions: {
    player: (typeof gameState.players)[0];
    pawn: (typeof gameState.players)[0]['pawns'][0];
    pos: Position;
    pawnKey: string;
    isWalking: boolean;
    isReturning: boolean;
  }[] = [];

  gameState.players.forEach((p) => {
    p.pawns.forEach((pawn) => {
      const pawnKey = `${p.id}_${pawn.id}`;
      const isCurrentlyWalking = !!(
        gameState.lastMove &&
        `${gameState.lastMove.playerId}_${gameState.lastMove.pawnIndex}` === pawnKey &&
        animatedSteps[pawnKey] !== undefined
      );
      const currentStep = isCurrentlyWalking ? animatedSteps[pawnKey] : pawn.step;
      pawnPositions.push({
        player: p,
        pawn,
        pos: getPawnPosition(p.color, pawn.id, currentStep),
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

  // Status
  let status: React.ReactNode = null;
  if (isLobby) {
    status = <StatusPill tone="wait" title={t('status.waiting_room')} detail={t('ludo.players_in_room', { current: totalPlayers })} />;
  } else if (gameState.state === 'WAITING_ROLL' || gameState.state === 'WAITING_MOVE') {
    status = isMyTurn ? (
      <StatusPill
        tone="turn"
        title={t('status.your_turn')}
        detail={canRoll ? t('ludo.status_roll') : t('ludo.status_move', { value: gameState.currentDice })}
      />
    ) : (
      <StatusPill
        tone="wait"
        title={t('status.turn_of', { name: activePlayer?.username })}
        detail={gameState.currentDice > 0 ? t('ludo.rolled', { value: gameState.currentDice }) : undefined}
      />
    );
  }

  const sideTabs: TabOption[] = [
    { id: 'players', label: t('game.players_count', { count: totalPlayers }), icon: <Users size={16} /> },
    { id: 'history', label: t('game.history'), icon: <HistoryIcon size={16} /> },
    { id: 'rules', label: t('game.rules'), icon: <BookOpen size={16} /> },
  ];

  const sideContent =
    sideTab === 'players' ? (
      <div className="space-y-2">
        {gameState.players.map((p) => {
          const cfg = COLOR_CONFIG[p.color as LudoColor] || COLOR_CONFIG.RED;
          const isActive = activePlayer?.id === p.id;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 min-h-15 px-3 rounded-2xl border ${isActive ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${cfg.bg}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-ink truncate">{p.username}</span>
                  {p.id === myId && <span className="text-xs text-muted">({t('game.you')})</span>}
                  {p.isBot && <Bot size={14} className="text-muted" aria-label={t('lobby.bot')} />}
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-raised overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(p.score / 4) * 100}%`, background: cfg.hex }} />
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-body shrink-0">{t('ludo.pawns_in_goal', { count: p.score })}</span>
            </div>
          );
        })}
      </div>
    ) : sideTab === 'history' ? (
      gameState.actionLog?.length ? (
        <ul className="space-y-2">
          {gameState.actionLog
            .slice(-20)
            .reverse()
            .map((log, idx) => (
              <li key={idx} className="text-sm text-body p-3 rounded-xl bg-surface border border-line">
                {log}
              </li>
            ))}
        </ul>
      ) : (
        <EmptyState>{t('game.no_history')}</EmptyState>
      )
    ) : (
      <RulesList
        items={[
          { title: t('ludo.rule1_title'), body: t('ludo.rule1_body') },
          { title: t('ludo.rule2_title'), body: t('ludo.rule2_body') },
          { title: t('ludo.rule3_title'), body: t('ludo.rule3_body') },
        ]}
      />
    );

  const lobbyPlayers: LobbyPlayer[] = gameState.players.map((p) => ({
    id: p.id,
    name: p.username,
    isMe: p.id === myId,
    isHost: p.id === gameState.leaderId,
    isOnline: p.isConnected,
    isBot: p.isBot,
    badge: p.color ? <span className={`w-4 h-4 rounded-full shrink-0 ${COLOR_CONFIG[p.color as LudoColor]?.bg}`} aria-label={t(COLOR_CONFIG[p.color as LudoColor]?.nameKey)} /> : null,
  }));

  const rankings = gameState.rankings && gameState.rankings.length > 0 ? gameState.rankings : gameState.winner ? [gameState.winner] : [];

  return (
    <GameShell
      accent="amber"
      phaseKey={isLobby ? 'lobby' : 'board'}
      showRail={!isLobby}
      side={{
        title: 'Ludo',
        tabs: sideTabs,
        activeTab: sideTab,
        onTabChange: (id) => setSideTab(id as SideTab),
        content: sideContent,
      }}
      sideOpen={sideOpen}
      onSideClose={() => setSideOpen(false)}
      header={
        <GameHeader
          gameTitle="Ludo"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => openSide('players')}
          onToggleLog={() => openSide('history')}
          onToggleRules={() => openSide('rules')}
          railVisible={!isLobby}
          status={status}
        />
      }
      notices={
        <AnimatePresence>
          <ConnectionNotices key="conn" isReconnecting={isReconnecting} reconnectAttempt={reconnectAttempt} onReconnect={manualReconnect} />
          {extraTurnBanner && <GameNotice key="extra" tone="info" title={extraTurnBanner} />}
          {toastMessage && <GameNotice key="toast" tone="warning" title={toastMessage} onClose={clearToast} />}
          {errorMsg && <GameNotice key="err" tone="error" title={errorMsg} onClose={clearError} />}
        </AnimatePresence>
      }
      overlay={
        <AnimatePresence>
          {gameState.state === 'PODIUM_CHOICE' && gameState.winner && (
            <ResultModal
              key="podium"
              tone="win"
              icon={<Medal size={32} />}
              eyebrow={t('ludo.first_place_title')}
              title={gameState.winner.username}
              actions={
                isLeader ? (
                  <>
                    <button type="button" onClick={finishMatch} className="btn btn-secondary btn-lg sm:flex-1">
                      {t('ludo.finish_match')}
                    </button>
                    <button type="button" onClick={continueMatch} className="btn btn-primary btn-lg sm:flex-1">
                      {t('ludo.continue_match')}
                    </button>
                  </>
                ) : undefined
              }
            >
              <p className="text-body">{t('ludo.podium_choice_desc')}</p>
              {!isLeader && <p className="text-sm text-amber-300">{t('ludo.waiting_leader_podium')}</p>}
            </ResultModal>
          )}
          {gameState.state === 'GAME_OVER' && gameState.winner && (
            <ResultModal
              key="over"
              tone="win"
              icon={<Crown size={32} />}
              eyebrow={t('ludo.champion_title')}
              title={gameState.winner.username}
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
                {rankings.map((p, idx) => {
                  const cfg = COLOR_CONFIG[p.color as LudoColor] || COLOR_CONFIG.RED;
                  return (
                    <li key={p.id} className="flex items-center gap-3 min-h-12 px-3 rounded-xl bg-raised">
                      <span className="font-display font-bold text-lg text-accent w-6">{idx + 1}º</span>
                      <span className={`w-3 h-3 rounded-full ${cfg.bg}`} aria-hidden="true" />
                      <span className="flex-1 font-bold text-ink truncate">{p.username}</span>
                      <span className="text-sm text-muted">{t('ludo.pawns_in_goal', { count: p.score })}</span>
                    </li>
                  );
                })}
              </ol>
            </ResultModal>
          )}
        </AnimatePresence>
      }
    >
      {isLobby && (
        <GameLobby
          description={t('ludo.lobby_desc')}
          players={lobbyPlayers}
          minPlayers={1}
          maxPlayers={4}
          isHost={isLeader}
          onStart={startGame}
          startBlockedReason={null}
          howTo={[t('ludo.howto_1'), t('ludo.howto_2'), t('ludo.howto_3')]}
          settings={
            <div className="flex flex-col gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-bold text-ink mb-2">{t('ludo.choose_color')}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['RED', 'GREEN', 'YELLOW', 'BLUE'] as LudoColor[]).map((color) => {
                    const cfg = COLOR_CONFIG[color];
                    const owner = gameState.players.find((p) => p.color === color);
                    const isMine = owner?.id === myId;
                    const isFree = !owner;
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={!isFree && !isMine}
                        onClick={() => isFree && chooseColor(color)}
                        aria-pressed={isMine}
                        className={`min-h-12 px-3 rounded-xl border-2 flex items-center gap-2 text-left text-sm font-bold transition-colors ${
                          isMine
                            ? 'border-accent bg-accent-soft text-ink'
                            : isFree
                            ? 'border-line-strong text-body hover:border-accent-line cursor-pointer'
                            : 'border-line text-muted cursor-not-allowed'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full shrink-0 ${cfg.bg}`} aria-hidden="true" />
                        <span className="flex-1 truncate">{owner ? owner.username : t(cfg.nameKey)}</span>
                        {isMine && <Check size={16} strokeWidth={3} className="text-accent" />}
                        {isFree && <span className="text-xs text-muted">{t('ludo.color_free')}</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className={`flex items-center justify-between gap-3 min-h-12 px-3 rounded-xl border border-line-strong ${isLeader ? 'cursor-pointer' : 'opacity-70'}`}>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                  <Bot size={18} className="text-accent" />
                  {t('ludo.fill_bots_label')}
                </span>
                <input type="checkbox" checked={gameState.fillBots} onChange={toggleBots} disabled={!isLeader} className="w-5 h-5 accent-[var(--accent)] cursor-pointer" />
              </label>
            </div>
          }
        />
      )}

      {!isLobby && (
        <div className="w-full h-full flex flex-col lg:flex-row items-stretch gap-4 xl:gap-6 min-h-0">
          {/* Tabuleiro: ocupa todo o espaço disponível (antes: máx. 490px) */}
          <div className="flex-1 min-h-0 min-w-0 [container-type:size] flex items-center justify-center">
            <div className="relative w-[min(100cqw,100cqh)] aspect-square bg-surface border-4 border-raised rounded-3xl p-[1.6%] select-none">
              {/* Garagens */}
              {(
                [
                  ['RED', 'top-[1.6%] left-[1.6%]', 'bg-red-500'],
                  ['GREEN', 'top-[1.6%] right-[1.6%]', 'bg-emerald-500'],
                  ['BLUE', 'bottom-[1.6%] left-[1.6%]', 'bg-blue-500'],
                  ['YELLOW', 'bottom-[1.6%] right-[1.6%]', 'bg-amber-400'],
                ] as const
              ).map(([color, pos, bg]) => (
                <div key={color} className={`absolute ${pos} w-[38.6%] h-[38.6%] rounded-[6%] ${bg} p-[7%] pointer-events-none`}>
                  <div className="w-full h-full bg-white/95 rounded-[10%]" />
                </div>
              ))}

              {/* Vagas da garagem nas mesmas células que o servidor usa para os peões (YardCoordinates) */}
              <div className="absolute inset-[1.6%] pointer-events-none z-[15]">
                {[1, 4, 10, 13].flatMap((row) =>
                  [1, 4, 10, 13].map((col) => (
                    <span
                      key={`${row}_${col}`}
                      style={{ top: `${(row / 15) * 100}%`, left: `${(col / 15) * 100}%` }}
                      className="absolute w-[6.667%] h-[6.667%] flex items-center justify-center"
                    >
                      <span className="w-[86%] h-[86%] rounded-full border-2 border-slate-300 bg-slate-100" />
                    </span>
                  ))
                )}
              </div>

              {/* Grade 15x15 */}
              <div
                style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))', gridTemplateRows: 'repeat(15, minmax(0, 1fr))' }}
                className="relative w-full h-full grid gap-px rounded-xl overflow-hidden z-10"
              >
                {Array.from({ length: 15 }).map((_, row) =>
                  Array.from({ length: 15 }).map((_, col) => {
                    const isYardCell = (row < 6 && col < 6) || (row < 6 && col > 8) || (row > 8 && col < 6) || (row > 8 && col > 8);
                    if (isYardCell) return <div key={`${row}_${col}`} className="opacity-0 pointer-events-none" />;

                    let cellColor = 'bg-slate-100 text-slate-700';
                    let icon: React.ReactNode = null;
                    const iconCls = 'w-3/5 h-3/5';

                    if (row === 7 && col >= 1 && col <= 5) cellColor = 'bg-red-400';
                    else if (col === 7 && row >= 1 && row <= 5) cellColor = 'bg-emerald-400';
                    else if (row === 7 && col >= 9 && col <= 13) cellColor = 'bg-amber-300';
                    else if (col === 7 && row >= 9 && row <= 13) cellColor = 'bg-blue-400';
                    else if (row === 6 && col === 1) {
                      cellColor = 'bg-red-500 text-white';
                      icon = <ArrowRight className={iconCls} strokeWidth={3} />;
                    } else if (row === 1 && col === 8) {
                      cellColor = 'bg-emerald-500 text-white';
                      icon = <ArrowDown className={iconCls} strokeWidth={3} />;
                    } else if (row === 8 && col === 13) {
                      cellColor = 'bg-amber-400 text-amber-950';
                      icon = <ArrowLeft className={iconCls} strokeWidth={3} />;
                    } else if (row === 13 && col === 6) {
                      cellColor = 'bg-blue-500 text-white';
                      icon = <ArrowUp className={iconCls} strokeWidth={3} />;
                    } else if ((row === 2 && col === 6) || (row === 6 && col === 12) || (row === 12 && col === 8) || (row === 8 && col === 2)) {
                      cellColor = 'bg-amber-100 text-amber-500';
                      icon = <Star className={iconCls} fill="currentColor" aria-label={t('ludo.safe_cell')} />;
                    } else if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
                      if (row === 7 && col === 6) cellColor = 'bg-red-500';
                      else if (row === 6 && col === 7) cellColor = 'bg-emerald-500';
                      else if (row === 7 && col === 8) cellColor = 'bg-amber-400';
                      else if (row === 8 && col === 7) cellColor = 'bg-blue-500';
                      else if (row === 7 && col === 7) {
                        cellColor = 'bg-slate-900 text-amber-300';
                        icon = <Trophy className={iconCls} aria-label={t('ludo.board_home')} />;
                      } else cellColor = 'bg-slate-800';
                    }

                    return (
                      <div key={`${row}_${col}`} className={`flex items-center justify-center ${cellColor}`}>
                        {icon}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Peões */}
              <div className="absolute inset-[1.6%] pointer-events-none z-20">
                {pawnPositions.map(({ player: pawnOwner, pawn, pos, pawnKey, isWalking, isReturning }) => {
                  const coordKey = `${pos.row}_${pos.col}`;
                  const countInCoord = pawnsPerCoord[coordKey] || 1;
                  const idxInCoord = coordCounter[coordKey] || 0;
                  coordCounter[coordKey] = idxInCoord + 1;

                  let offsetX = 0;
                  let offsetY = 0;
                  if (!pawn.inYard && countInCoord > 1) {
                    if (countInCoord === 2) {
                      offsetX = idxInCoord === 0 ? -15 : 15;
                      offsetY = idxInCoord === 0 ? -15 : 15;
                    } else {
                      offsetX = idxInCoord % 2 === 0 ? -18 : 18;
                      offsetY = idxInCoord < 2 ? -18 : 18;
                    }
                  }

                  const canMoveThisPawn =
                    isMyTurn && pawnOwner.id === myId && gameState.state === 'WAITING_MOVE' && gameState.validMoves.includes(pawn.id);
                  const cfg = COLOR_CONFIG[pawn.color];

                  return (
                    <motion.div
                      key={pawnKey}
                      initial={false}
                      animate={{
                        top: `${(pos.row / 15) * 100}%`,
                        left: `${(pos.col / 15) * 100}%`,
                        scale: isReturning ? [1.2, 0.8, 1] : isWalking ? 1.2 : 1,
                        rotate: isReturning ? [0, 360] : 0,
                        zIndex: isWalking || isReturning ? 40 : canMoveThisPawn ? 30 : 20 + idxInCoord,
                      }}
                      transition={isReturning ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0.14, ease: 'easeInOut' }}
                      style={{ width: '6.666%', height: '6.666%' }}
                      className="absolute flex items-center justify-center pointer-events-auto"
                    >
                      <motion.button
                        type="button"
                        disabled={!canMoveThisPawn}
                        onClick={() => canMoveThisPawn && movePawn(pawn.id)}
                        aria-label={t('ludo.pawn_label', { color: t(cfg.nameKey), num: pawn.id + 1 })}
                        whileHover={canMoveThisPawn ? { scale: 1.25 } : {}}
                        animate={canMoveThisPawn ? { scale: [1, 1.15, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
                        transition={{ duration: 0.6, repeat: canMoveThisPawn ? Infinity : 0 }}
                        style={{ translate: `${offsetX}% ${offsetY}%` }}
                        className={`relative rounded-full flex items-center justify-center border-[3px] ${pawn.inYard ? 'w-[86%] h-[86%]' : 'w-[74%] h-[74%]'} ${cfg.bg} ${
                          canMoveThisPawn
                            ? "border-white shadow-[0_0_0_4px_rgba(255,255,255,0.45)] cursor-pointer before:content-[''] before:absolute before:-inset-3"
                            : `${cfg.ring} shadow-md cursor-default`
                        }`}
                      >
                        <span className="hidden @min-[520px]:inline font-mono font-bold text-slate-950 text-[clamp(12px,2.2cqmin,16px)] leading-none">{pawn.id + 1}</span>
                        {idxInCoord === 0 && countInCoord > 1 && !pawn.inYard && (
                          <span className="hidden @min-[520px]:inline absolute -top-2.5 -right-2.5 bg-slate-950 text-white font-mono font-bold text-xs px-1 rounded-full border border-white/40">
                            ×{countInCoord}
                          </span>
                        )}
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Painel do turno: coluna ao lado do tabuleiro no desktop, barra embaixo no mobile */}
          <section
            aria-label={t('ludo.turn_panel')}
            className={`shrink-0 lg:w-80 lg:self-center surface p-4 lg:p-5 flex lg:flex-col items-center lg:items-stretch gap-4 ${isMyTurn ? 'border-accent-line' : ''}`}
          >
            <p className="label-caps hidden lg:block" style={isMyTurn ? { color: 'var(--accent)' } : undefined}>
              {isMyTurn ? t('ludo.your_move') : t('status.turn_of', { name: activePlayer?.username })}
            </p>
            <div className="flex items-center gap-4 flex-1 lg:flex-none min-w-0">
              <DiceView value={gameState.currentDice} isRolling={isRollingAnimation} canRoll={canRoll} onClick={canRoll ? rollDice : undefined} />
              <p className="text-sm lg:text-[15px] text-body leading-snug min-w-0">
                {canRoll
                  ? t('ludo.hint_roll')
                  : isWaitingMove
                  ? t('ludo.select_pawn')
                  : t('ludo.hint_wait', { name: activePlayer?.username })}
              </p>
            </div>
            {canRoll && (
              <>
                <button type="button" onClick={rollDice} className="btn btn-primary btn-lg shrink-0">
                  <Dices size={20} />
                  {t('ludo.roll_dice')}
                </button>
                <span className="hidden lg:block text-xs text-muted text-center">{t('ludo.space_shortcut')}</span>
              </>
            )}

            {/* Placar compacto (no xl ele também está no trilho) */}
            <div className="hidden lg:flex xl:hidden flex-col gap-2 pt-2 border-t border-line">
              {gameState.players.map((p) => {
                const cfg = COLOR_CONFIG[p.color as LudoColor] || COLOR_CONFIG.RED;
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-3 h-3 rounded-full ${cfg.bg}`} aria-hidden="true" />
                    <span className="flex-1 truncate text-body">{p.username}</span>
                    <span className="font-mono text-muted">{p.score}/4</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </GameShell>
  );
}
