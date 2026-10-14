import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import { useWavelengthStore } from '../store/useWavelengthStore';
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
  ResultModal,
  EmptyState,
} from '../components/game/ui';
import { Users, BookOpen, History as HistoryIcon, Sparkles, Radio, Check, ArrowRight, Trophy, RotateCcw, Home } from 'lucide-react';
import { CustomThemeModal } from '../components/game/CustomThemeModal';

// Geometria do mostrador (arco semicircular)
const CX = 250;
const CY = 245;
const R_OUTER = 205;
const R_INNER = 130;

function pctToRad(pct: number): number {
  const clamped = Math.max(0, Math.min(100, pct));
  return Math.PI * (1 - clamped / 100);
}

function polarToCartesian(r: number, rad: number): { x: number; y: number } {
  return {
    x: CX + r * Math.cos(rad),
    y: CY - r * Math.sin(rad),
  };
}

function makeArcSector(p1: number, p2: number, rIn: number, rOut: number): string {
  const startPct = Math.max(0, Math.min(100, p1));
  const endPct = Math.max(0, Math.min(100, p2));
  if (startPct >= endPct) return '';

  const rad1 = pctToRad(startPct);
  const rad2 = pctToRad(endPct);

  const pOut1 = polarToCartesian(rOut, rad1);
  const pOut2 = polarToCartesian(rOut, rad2);
  const pIn2 = polarToCartesian(rIn, rad2);
  const pIn1 = polarToCartesian(rIn, rad1);

  return `M ${pIn1.x} ${pIn1.y} L ${pOut1.x} ${pOut1.y} A ${rOut} ${rOut} 0 0 1 ${pOut2.x} ${pOut2.y} L ${pIn2.x} ${pIn2.y} A ${rIn} ${rIn} 0 0 0 ${pIn1.x} ${pIn1.y} Z`;
}

type SideTab = 'players' | 'history' | 'rules';

export function WavelengthGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, session } = useAuthStore();
  const myId = user?.id || '';
  const token = session?.access_token || '';

  const {
    gameState,
    isReconnecting,
    reconnectAttempt,
    errorMsg,
    soundEnabled,
    connect,
    disconnect,
    manualReconnect,
    toggleReady,
    startGame,
    giveClue,
    updateDial,
    confirmGuess,
    nextRound,
    restartGame,
    toggleSound,
    clearError,
    sendMessage,
  } = useWavelengthStore();

  const [clueInput, setClueInput] = useState('');
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>('players');
  const [sideOpen, setSideOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!roomId || !token) return;
    connect(roomId, token);
    return () => {
      disconnect();
    };
  }, [roomId, token]);

  // Interação tátil/pointer com o mostrador
  const handlePointerInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current || !gameState || gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) {
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = 500 / rect.width;
      const scaleY = 280 / rect.height;

      const px = (clientX - rect.left) * scaleX;
      const py = (clientY - rect.top) * scaleY;

      const dx = px - CX;
      const dy = CY - py;

      let angleRad = Math.atan2(dy, dx);
      if (angleRad < 0) {
        angleRad = dx < 0 ? Math.PI : 0;
      }

      const rawPct = (1 - angleRad / Math.PI) * 100;
      const clampedPct = Math.max(0, Math.min(100, Math.round(rawPct * 10) / 10));
      updateDial(clampedPct);
    },
    [gameState, updateDial]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!gameState || gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) return;
    setIsDraggingDial(true);
    handlePointerInteraction(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingDial) return;
      handlePointerInteraction(e.clientX, e.clientY);
    };
    const handleGlobalPointerUp = () => {
      if (isDraggingDial) setIsDraggingDial(false);
    };

    if (isDraggingDial) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDraggingDial, handlePointerInteraction]);

  const handleSubmitClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueInput.trim()) return;
    giveClue(clueInput.trim());
    setClueInput('');
  };

  // Ajuste fino do dial (+/- passos) — também pelo teclado no mostrador
  const adjustDial = (delta: number) => {
    if (!gameState || gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) return;
    const next = Math.max(0, Math.min(100, Math.round((gameState.dialValue + delta) * 10) / 10));
    updateDial(next);
  };

  const getScoreRating = (score: number) => {
    if (score >= 22) return { title: t('wavelength.rating_telepath_title'), desc: t('wavelength.rating_telepath_desc') };
    if (score >= 15) return { title: t('wavelength.rating_great_title'), desc: t('wavelength.rating_great_desc') };
    if (score >= 8) return { title: t('wavelength.rating_good_title'), desc: t('wavelength.rating_good_desc') };
    return { title: t('wavelength.rating_low_title'), desc: t('wavelength.rating_low_desc') };
  };

  if (!gameState) {
    return (
      <GameLoading
        accent="cyan"
        message={isReconnecting ? t('wavelength.reconnecting') : t('wavelength.connecting')}
        onRetry={isReconnecting ? manualReconnect : undefined}
      />
    );
  }

  const isLeader = gameState.leaderId === myId;
  const isLobby = gameState.state === 'LOBBY';
  const isPlaying = !isLobby && gameState.state !== 'GAME_OVER';
  const isPsychic = gameState.isPsychic;
  const canDrag = gameState.state === 'GUESSING_PHASE' && !isPsychic;
  const target = gameState.targetValue;
  const showTargetWedge = gameState.isTargetVisible && target !== null;
  const dial = gameState.dialValue;
  const needleRad = pctToRad(dial);
  const needleTip = polarToCartesian(R_OUTER + 16, needleRad);
  const totalPlayers = gameState.players.length;

  const openSide = (tab: SideTab) => {
    setSideTab(tab);
    setSideOpen(true);
  };

  const lobbyPlayers: LobbyPlayer[] = gameState.players.map((pid) => ({
    id: pid,
    name: gameState.playerNames[pid] || pid.substring(0, 6),
    isMe: pid === myId,
    isHost: gameState.leaderId === pid,
    isOnline: gameState.playerConnected[pid] !== false,
    isReady: Boolean(gameState.playerReady[pid]),
  }));
  const readyCount = lobbyPlayers.filter((p) => p.isReady).length;

  let status: React.ReactNode = null;
  if (isLobby) {
    status = <StatusPill tone="wait" title={t('status.waiting_room')} detail={t('lobby.ready_count', { ready: readyCount, total: totalPlayers })} />;
  } else if (gameState.state === 'PSYCHIC_PHASE') {
    status = isPsychic ? (
      <StatusPill tone="turn" title={t('wavelength.status_you_psychic')} detail={t('wavelength.status_give_clue')} />
    ) : (
      <StatusPill tone="wait" title={t('status.turn_of', { name: gameState.psychicName })} detail={t('wavelength.status_psychic_thinking')} />
    );
  } else if (gameState.state === 'GUESSING_PHASE') {
    status = isPsychic ? (
      <StatusPill tone="wait" title={t('wavelength.status_team_tuning')} detail={t('wavelength.status_stay_silent')} />
    ) : (
      <StatusPill tone="turn" title={t('wavelength.status_move_needle')} detail={t('wavelength.status_confirm')} />
    );
  } else if (gameState.state === 'REVEAL_PHASE') {
    status = (
      <StatusPill
        tone={gameState.roundPoints > 0 ? 'success' : 'danger'}
        title={`+${gameState.roundPoints} ${t('common.pts')}`}
        detail={`${t('wavelength.target_label')} ${target?.toFixed(0)}% · ${t('wavelength.guess_label')} ${dial.toFixed(0)}%`}
      />
    );
  }

  const stats = isPlaying ? (
    <>
      <span className="chip shrink-0">
        {t('common.round')} {gameState.round}/{gameState.totalRounds}
      </span>
      <span className="chip chip-accent shrink-0">
        {gameState.teamScore} {t('common.pts')}
      </span>
    </>
  ) : null;

  const sideTabs: TabOption[] = [
    { id: 'players', label: t('game.players_count', { count: totalPlayers }), icon: <Users size={16} /> },
    { id: 'history', label: t('game.history'), icon: <HistoryIcon size={16} /> },
    { id: 'rules', label: t('game.rules'), icon: <BookOpen size={16} /> },
  ];

  const sideContent =
    sideTab === 'players' ? (
      <div className="space-y-2">
        {lobbyPlayers.map((p) => (
          <PlayerRow
            key={p.id}
            id={p.id}
            name={p.name}
            isMe={p.isMe}
            isHost={p.isHost}
            isOnline={p.isOnline}
            highlight={isPlaying && p.id === gameState.psychicId}
            subtitle={isPlaying && p.id === gameState.psychicId ? t('wavelength.psychic') : t('lobby.online')}
            right={
              isLobby ? (
                p.isReady ? <span className="chip chip-success">{t('lobby.ready')}</span> : <span className="chip chip-warning">{t('lobby.waiting')}</span>
              ) : null
            }
          />
        ))}
      </div>
    ) : sideTab === 'history' ? (
      gameState.history.length === 0 ? (
        <EmptyState>{t('wavelength.no_rounds_yet')}</EmptyState>
      ) : (
        <div className="space-y-2">
          {gameState.history.map((h, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-surface border border-line space-y-1">
              <div className="flex justify-between items-center gap-2">
                <span className="font-bold text-ink truncate">“{h.clue}”</span>
                <span className="chip chip-success shrink-0">+{h.points}</span>
              </div>
              <p className="text-sm text-body">
                {h.theme.left} ↔ {h.theme.right}
              </p>
              <p className="text-xs text-muted">
                {h.psychicName} · {t('wavelength.target_label')} {h.targetValue.toFixed(0)}% · {t('wavelength.guess_label')} {h.guessValue.toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      )
    ) : (
      <RulesList
        items={[
          { title: t('wavelength.rule1_title'), body: t('wavelength.rule1_body') },
          { title: t('wavelength.rule2_title'), body: t('wavelength.rule2_body') },
          { title: t('wavelength.rule3_title'), body: t('wavelength.rule3_body') },
        ]}
      />
    );

  const rating = getScoreRating(gameState.teamScore);

  return (
    <GameShell
      accent="cyan"
      phaseKey={isLobby ? 'lobby' : 'play'}
      showRail={!isLobby}
      side={{
        title: 'Wavelength',
        tabs: sideTabs,
        activeTab: sideTab,
        onTabChange: (id) => setSideTab(id as SideTab),
        content: sideContent,
      }}
      sideOpen={sideOpen}
      onSideClose={() => setSideOpen(false)}
      header={
        <GameHeader
          gameTitle="Wavelength"
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
          stats={stats}
        />
      }
      notices={
        <AnimatePresence>
          <ConnectionNotices key="conn" isReconnecting={isReconnecting} reconnectAttempt={reconnectAttempt} onReconnect={manualReconnect} />
          {errorMsg && <GameNotice key="err" tone="error" title={errorMsg} onClose={clearError} />}
        </AnimatePresence>
      }
      footer={
        isPlaying ? (
          <div className="w-full bg-surface border-t border-line px-3 md:px-6 py-3">
            <div className="max-w-3xl mx-auto">
              {gameState.state === 'PSYCHIC_PHASE' &&
                (isPsychic ? (
                  <form onSubmit={handleSubmitClue} className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="wl-clue" className="sr-only">
                      {t('wavelength.clue_title')}
                    </label>
                    <input
                      id="wl-clue"
                      type="text"
                      maxLength={70}
                      placeholder={t('wavelength.clue_placeholder')}
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value)}
                      className="field flex-1 font-semibold"
                      autoFocus
                    />
                    <button type="submit" disabled={!clueInput.trim()} className="btn btn-primary">
                      <Radio size={18} />
                      {t('wavelength.submit_clue_btn')}
                    </button>
                  </form>
                ) : (
                  <p className="text-center text-sm text-muted py-2">
                    {t('wavelength.waiting_psychic_clue_named', { name: gameState.psychicName })}
                  </p>
                ))}

              {gameState.state === 'GUESSING_PHASE' &&
                (!isPsychic ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      {[-5, -1].map((d) => (
                        <button key={d} type="button" onClick={() => adjustDial(d)} className="btn btn-secondary btn-sm font-mono" aria-label={t('wavelength.adjust_by', { value: d })}>
                          {d}
                        </button>
                      ))}
                      <span className="font-mono font-bold text-lg text-accent w-20 text-center" aria-live="polite">
                        {dial.toFixed(1)}%
                      </span>
                      {[1, 5].map((d) => (
                        <button key={d} type="button" onClick={() => adjustDial(d)} className="btn btn-secondary btn-sm font-mono" aria-label={t('wavelength.adjust_by', { value: d })}>
                          +{d}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={confirmGuess} className="btn btn-primary btn-lg sm:flex-1">
                      <Check size={18} strokeWidth={3} />
                      {t('wavelength.confirm_guess_btn')}
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted py-2">{t('wavelength.psychic_silence')}</p>
                ))}

              {gameState.state === 'REVEAL_PHASE' && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-bold text-2xl text-accent block">
                      +{gameState.roundPoints} {t('common.pts')}
                    </span>
                    <span className="text-sm text-muted block truncate">
                      {t('wavelength.target_label')} {target?.toFixed(1)}% · {t('wavelength.guess_label')} {dial.toFixed(1)}%
                    </span>
                  </div>
                  <button type="button" onClick={nextRound} className="btn btn-primary btn-lg shrink-0">
                    {gameState.round >= gameState.totalRounds ? t('wavelength.finish_game_btn') : t('wavelength.next_round_btn')}
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null
      }
      overlay={
        <>
          <AnimatePresence>
            {gameState.state === 'GAME_OVER' && (
              <ResultModal
                key="over"
                tone={gameState.teamScore >= 15 ? 'win' : 'neutral'}
                icon={<Trophy size={32} />}
                eyebrow={rating.title}
                title={`${gameState.teamScore} / ${gameState.totalRounds * 4} ${t('common.pts')}`}
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
                <p className="text-body">{rating.desc}</p>
              </ResultModal>
            )}
          </AnimatePresence>
          <CustomThemeModal
            isOpen={showCustomModal}
            onClose={() => setShowCustomModal(false)}
            gameType="wavelength"
            existingCustomCount={gameState.customThemesCount || 0}
            onSaveThemes={(payload) => sendMessage(payload.type, payload)}
          />
        </>
      }
    >
      {isLobby && (
        <GameLobby
          description={t('wavelength.lobby_desc')}
          players={lobbyPlayers}
          minPlayers={2}
          maxPlayers={12}
          isHost={isLeader}
          isReadyMe={Boolean(gameState.playerReady[myId])}
          onToggleReady={toggleReady}
          onStart={startGame}
          startBlockedReason={lobbyBlockReason(t, lobbyPlayers, 2)}
          howTo={[t('wavelength.howto_1'), t('wavelength.howto_2'), t('wavelength.howto_3')]}
          settings={
            <button type="button" onClick={() => setShowCustomModal(true)} className="btn btn-secondary btn-block justify-between">
              <span className="inline-flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                {t('wavelength.custom_themes')}
              </span>
              <span className="chip chip-accent">{gameState.customThemesCount || 0}</span>
            </button>
          }
        />
      )}

      {!isLobby && (
        <div className="w-full h-full max-w-6xl flex flex-col items-center gap-3 md:gap-4 min-h-0">
          {/* Espectro */}
          <div className="w-full shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 rounded-2xl bg-surface border border-line">
            <div className="min-w-0">
              <span className="label-caps block">0%</span>
              <span className="font-display font-bold text-base md:text-2xl text-cyan-200 block truncate">{gameState.currentTheme.left}</span>
            </div>
            {gameState.currentTheme.category && <span className="chip hidden sm:inline-flex">{gameState.currentTheme.category}</span>}
            <div className="min-w-0 text-right col-start-3">
              <span className="label-caps block">100%</span>
              <span className="font-display font-bold text-base md:text-2xl text-pink-200 block truncate">{gameState.currentTheme.right}</span>
            </div>
          </div>

          {gameState.currentClue && (
            <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-amber-950 border border-amber-700">
              <span className="label-caps text-amber-300">{t('wavelength.clue_title')}</span>
              <span className="font-display font-bold text-lg md:text-2xl text-amber-100">“{gameState.currentClue}”</span>
            </div>
          )}

          {/* Mostrador: ocupa todo o espaço disponível */}
          <div className="relative flex-1 min-h-0 w-full [container-type:size] flex items-center justify-center">
            <svg
              ref={svgRef}
              viewBox="0 0 500 280"
              role="slider"
              aria-label={t('wavelength.dial_label')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(dial)}
              aria-disabled={!canDrag}
              tabIndex={canDrag ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  adjustDial(e.shiftKey ? -5 : -1);
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  adjustDial(e.shiftKey ? 5 : 1);
                }
              }}
              style={{ touchAction: 'none' }}
              className={`w-[min(100cqw,178cqh)] h-auto select-none outline-none focus-visible:drop-shadow-[0_0_8px_var(--accent)] ${
                canDrag ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
              onPointerDown={handlePointerDown}
            >
              <defs>
                <linearGradient id="spectrumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.8" />
                </filter>
                <filter id="bullseyeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#eab308" floodOpacity="0.9" />
                </filter>
              </defs>

              {/* Dial Casing / Backplate */}
              <path
                d={makeArcSector(0, 100, R_INNER - 8, R_OUTER + 8)}
                fill="#0b0f19"
                stroke="#1e293b"
                strokeWidth="3"
              />

              {/* Rainbow Spectrum Track */}
              <path
                d={makeArcSector(0, 100, R_INNER, R_OUTER)}
                fill="url(#spectrumGradient)"
                opacity="0.3"
              />

              {/* Graduation ticks */}
              {Array.from({ length: 21 }).map((_, i) => {
                const stepPct = i * 5;
                const r = pctToRad(stepPct);
                const isMajor = stepPct % 25 === 0;
                const isMid = stepPct % 10 === 0;
                const p1 = polarToCartesian(R_OUTER + 2, r);
                const p2 = polarToCartesian(R_OUTER + (isMajor ? 10 : isMid ? 6 : 3), r);
                return (
                  <line
                    key={i}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={isMajor ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                    strokeWidth={isMajor ? 2 : 1}
                  />
                );
              })}

              {/* Percentage Labels */}
              {[0, 25, 50, 75, 100].map((labelPct) => {
                // Fora do alcance da ponta do ponteiro; nas pontas, abaixo do arco para não bater nos traços
                const isEnd = labelPct === 0 || labelPct === 100;
                const textPos = polarToCartesian(isEnd ? R_OUTER + 2 : R_OUTER + 32, pctToRad(labelPct));
                return (
                  <text
                    key={labelPct}
                    x={textPos.x}
                    y={isEnd ? textPos.y + 22 : textPos.y + 4}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.7)"
                    fontSize="13"
                    fontWeight="800"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {labelPct}%
                  </text>
                );
              })}

              {/* Target Wedge (Psychic or Reveal) */}
              {showTargetWedge && (
                <g className="transition-all duration-500">
                  <path
                    d={makeArcSector(target - 12.5, target - 7.5, R_INNER, R_OUTER)}
                    fill="#06b6d4"
                    opacity="0.9"
                  />
                  <path
                    d={makeArcSector(target + 7.5, target + 12.5, R_INNER, R_OUTER)}
                    fill="#06b6d4"
                    opacity="0.9"
                  />
                  <path
                    d={makeArcSector(target - 7.5, target - 2.5, R_INNER, R_OUTER)}
                    fill="#f97316"
                    opacity="0.95"
                  />
                  <path
                    d={makeArcSector(target + 2.5, target + 7.5, R_INNER, R_OUTER)}
                    fill="#f97316"
                    opacity="0.95"
                  />
                  <path
                    d={makeArcSector(target - 2.5, target + 2.5, R_INNER, R_OUTER)}
                    fill="#eab308"
                    filter="url(#bullseyeGlow)"
                  />
                  {(() => {
                    const labelPos = polarToCartesian((R_INNER + R_OUTER) / 2, pctToRad(target));
                    return (
                      <text
                        x={labelPos.x}
                        y={labelPos.y + 4}
                        textAnchor="middle"
                        fill="#000"
                        fontSize="12"
                        fontWeight="900"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        4
                      </text>
                    );
                  })()}
                </g>
              )}

              {/* Mechanical shutter when hidden */}
              {!showTargetWedge && (
                <path
                  d={makeArcSector(0, 100, R_INNER + 2, R_OUTER - 2)}
                  fill="#050811"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.5"
                />
              )}

              {/* Needle pointer */}
              <g filter="url(#needleGlow)">
                <line
                  x1={CX}
                  y1={CY}
                  x2={needleTip.x}
                  y2={needleTip.y}
                  stroke="#ef4444"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle
                  cx={needleTip.x}
                  cy={needleTip.y}
                  r={isDraggingDial ? 8 : 6}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>

              {/* Center Hub Pivot */}
              <circle cx={CX} cy={CY} r="24" fill="#0f172a" stroke="#ef4444" strokeWidth="2.5" />
              <circle cx={CX} cy={CY} r="12" fill="#ef4444" />
              <circle cx={CX} cy={CY} r="4" fill="#ffffff" />
            </svg>
          </div>
        </div>
      )}
    </GameShell>
  );
}
